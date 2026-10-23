import "server-only"

import { NextResponse } from "next/server"
import { and, eq, inArray, isNull } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import {
  entities,
  entityCategories,
  pandaProperties,
  propertyEntities,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import {
  getDriveAccessToken,
  findDriveFolder,
  listFilesInFolder,
  listSubfoldersInFolder,
  shareFilePublicly,
} from "@/lib/google-drive-client"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"

const DRIVE_SOURCE = "google_drive"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const { propertyListId: propertyListIdRaw } = body as Record<string, unknown>
  const propertyListId = Number(propertyListIdRaw)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Missing or invalid field: propertyListId", 400)
  }

  const [prop] = await db
    .select({
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
      owner1name: pandaProperties.owner1name,
      owner2name: pandaProperties.owner2name,
      owner3name: pandaProperties.owner3name,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!prop) return adminJsonError("Property not found", 404)

  let accessToken: string
  try {
    accessToken = await getDriveAccessToken()
  } catch {
    return adminJsonError(
      "Google Drive is not connected. Please reconnect your Google account.",
      503,
    )
  }

  // ── Find property folder ────────────────────────────────────────────────────
  const folderName = buildPropertyFolderName(prop.streetAddress, prop.suburb, prop.state, prop.postcode)
  let propertyFolderId: string | null
  try {
    propertyFolderId = await findDriveFolder(accessToken, folderName, PANDA_DRIVE_PARENT_FOLDER_ID)
  } catch {
    return adminJsonError("Failed to search Google Drive folder", 502)
  }

  const syncedAt = new Date()

  if (!propertyFolderId) {
    await db
      .update(pandaProperties)
      .set({ lastDriveSyncedAt: syncedAt })
      .where(eq(pandaProperties.propertyListId, propertyListId))
    return NextResponse.json({ added: 0, upserted: 0, syncedAt: syncedAt.toISOString() })
  }

  // ── Fetch existing Drive file IDs to deduplicate ───────────────────────────
  const [existingListFiles, existingEntityJoinRows] = await Promise.all([
    db
      .select({ googleDriveFileId: propertyListFiles.googleDriveFileId })
      .from(propertyListFiles)
      .where(eq(propertyListFiles.propertyListId, propertyListId)),
    db
      .select({
        googleDriveFileId: propertyEntityFiles.googleDriveFileId,
        propertyEntityId: propertyEntityFiles.propertyEntityId,
      })
      .from(propertyEntityFiles)
      .innerJoin(
        propertyEntities,
        eq(propertyEntityFiles.propertyEntityId, propertyEntities.propertyEntityId),
      )
      .where(eq(propertyEntities.propertyListId, propertyListId)),
  ])

  const existingDriveIds = new Set<string>([
    ...(existingListFiles.map((r) => r.googleDriveFileId).filter(Boolean) as string[]),
    ...(existingEntityJoinRows.map((r) => r.googleDriveFileId).filter(Boolean) as string[]),
  ])

  // ── Fetch linked entities for subfolder matching ───────────────────────────
  const linkedEntityRows = await db
    .select({
      propertyEntityId: propertyEntities.propertyEntityId,
      entityName: entities.entityName,
      categoryName: entityCategories.entityCategoryName,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .innerJoin(entityCategories, eq(entities.entityCategoryId, entityCategories.entityCategoryId))
    .where(eq(propertyEntities.propertyListId, propertyListId))

  const entityByName = new Map(
    linkedEntityRows.map((r) => [r.entityName.toLowerCase(), r]),
  )

  const ownerByName = new Map<string, 1 | 2 | 3>(
    (
      [
        [prop.owner1name, 1],
        [prop.owner2name, 2],
        [prop.owner3name, 3],
      ] as [string | null, 1 | 2 | 3][]
    )
      .filter(([name]) => name != null && name.trim() !== "")
      .map(([name, num]) => [name!.toLowerCase(), num]),
  )

  // ── Fetch all Drive files in parallel ─────────────────────────────────────
  let propertyFiles: Awaited<ReturnType<typeof listFilesInFolder>>
  let subfolders: Awaited<ReturnType<typeof listSubfoldersInFolder>>
  try {
    ;[propertyFiles, subfolders] = await Promise.all([
      listFilesInFolder(accessToken, propertyFolderId),
      listSubfoldersInFolder(accessToken, propertyFolderId),
    ])
  } catch {
    return adminJsonError("Failed to list Google Drive files", 502)
  }

  let subfolderFileLists: Awaited<ReturnType<typeof listFilesInFolder>>[]
  try {
    subfolderFileLists = await Promise.all(
      subfolders.map((folder) => listFilesInFolder(accessToken, folder.id)),
    )
  } catch {
    return adminJsonError("Failed to list Google Drive files", 502)
  }

  // ── Compute inserts and upserts ────────────────────────────────────────────
  type DriveFile = (typeof propertyFiles)[number]
  type EntityInsert = { propertyEntityId: number; files: DriveFile[] }
  type ListInsert = { ownerNum: 1 | 2 | 3 | null; files: DriveFile[] }
  type OwnerUpsert = { ownerNum: 1 | 2 | 3; fileIds: string[] }

  const seenIds = new Set(existingDriveIds)

  const newPropertyFiles = propertyFiles.filter((f) => f.id && !seenIds.has(f.id))
  newPropertyFiles.forEach((f) => seenIds.add(f.id))

  const listInserts: ListInsert[] = newPropertyFiles.length > 0
    ? [{ ownerNum: null, files: newPropertyFiles }]
    : []
  const entityInserts: EntityInsert[] = []
  const ownerUpserts: OwnerUpsert[] = []

  for (let i = 0; i < subfolders.length; i++) {
    const folder = subfolders[i]
    const folderFiles = subfolderFileLists[i]
    const folderNameLower = folder.name.toLowerCase()

    const entityMatch = entityByName.get(folderNameLower)
    const ownerNum = entityMatch ? undefined : ownerByName.get(folderNameLower)

    if (ownerNum != null) {
      const alreadySyncedIds = folderFiles
        .map((f) => f.id)
        .filter((id): id is string => Boolean(id) && existingDriveIds.has(id))
      if (alreadySyncedIds.length > 0) {
        ownerUpserts.push({ ownerNum, fileIds: alreadySyncedIds })
      }
    }

    const newFiles = folderFiles.filter((f) => f.id && !seenIds.has(f.id))
    if (newFiles.length === 0) continue

    newFiles.forEach((f) => seenIds.add(f.id))

    if (entityMatch) {
      entityInserts.push({ propertyEntityId: entityMatch.propertyEntityId, files: newFiles })
    } else {
      listInserts.push({ ownerNum: ownerNum ?? null, files: newFiles })
    }
  }

  // ── Share all new files publicly in parallel (non-fatal) ──────────────────
  await Promise.all(
    [...listInserts.flatMap((l) => l.files), ...entityInserts.flatMap((e) => e.files)].map(
      async (f) => {
        try {
          await shareFilePublicly(accessToken, f.id)
        } catch (err) {
          console.warn("[drive-sync] shareFilePublicly failed for", f.id, err)
        }
      },
    ),
  )

  // ── Write all changes in a single transaction ──────────────────────────────
  let added = 0
  let upserted = 0

  try {
    await db.transaction(async (tx) => {
      for (const { ownerNum, files } of listInserts) {
        await tx.insert(propertyListFiles).values(
          files.map((f) => ({
            propertyListId,
            fileName: f.name,
            fileType: f.mimeType,
            fileSize: f.size != null ? Number(f.size) : null,
            fileLink: f.webViewLink ?? null,
            googleDriveFileId: f.id,
            source: DRIVE_SOURCE,
            ownerNum: ownerNum ?? null,
          })),
        )
        added += files.length
      }

      for (const { propertyEntityId, files } of entityInserts) {
        await tx.insert(propertyEntityFiles).values(
          files.map((f) => ({
            propertyEntityId,
            fileName: f.name,
            fileType: f.mimeType,
            fileSize: f.size != null ? Number(f.size) : null,
            fileLink: f.webViewLink ?? null,
            googleDriveFileId: f.id,
            source: DRIVE_SOURCE,
          })),
        )
        added += files.length
      }

      for (const { ownerNum, fileIds } of ownerUpserts) {
        const updated = await tx
          .update(propertyListFiles)
          .set({ ownerNum })
          .where(
            and(
              eq(propertyListFiles.propertyListId, propertyListId),
              inArray(propertyListFiles.googleDriveFileId, fileIds),
              isNull(propertyListFiles.ownerNum),
            ),
          )
          .returning({ id: propertyListFiles.propertyListFileId })
        upserted += updated.length
      }

      await tx
        .update(pandaProperties)
        .set({ lastDriveSyncedAt: syncedAt })
        .where(eq(pandaProperties.propertyListId, propertyListId))
    })
  } catch (err) {
    console.error("[drive-sync] transaction failed:", err)
    return adminJsonError("Failed to save synced files", 500)
  }

  return NextResponse.json({ added, upserted, syncedAt: syncedAt.toISOString() })
}
