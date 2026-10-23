import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { entities, pandaProperties, propertyEntities } from "@/db/schema"
import { getDriveAccessToken, getOrCreateDriveFolder, initiateResumableUpload } from "@/lib/google-drive-client"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const { fileName, mimeType, fileSize, propertyEntityId: propertyEntityIdRaw } =
    body as Record<string, unknown>

  if (typeof fileName !== "string" || fileName.trim() === "") {
    return adminJsonError("Missing required field: fileName", 400)
  }
  if (typeof mimeType !== "string" || mimeType.trim() === "") {
    return adminJsonError("Missing required field: mimeType", 400)
  }
  if (typeof fileSize !== "number" || fileSize <= 0) {
    return adminJsonError("Missing or invalid field: fileSize", 400)
  }
  const propertyEntityId = Number(propertyEntityIdRaw)
  if (!Number.isFinite(propertyEntityId) || propertyEntityId <= 0) {
    return adminJsonError("Missing or invalid field: propertyEntityId", 400)
  }

  const [entityRow] = await db
    .select({
      entityName: entities.entityName,
      propertyListId: propertyEntities.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(entities.entityId, propertyEntities.entityId))
    .leftJoin(pandaProperties, eq(pandaProperties.propertyListId, propertyEntities.propertyListId))
    .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
    .limit(1)

  if (!entityRow) return adminJsonError("Property entity not found", 404)

  let accessToken: string
  try {
    accessToken = await getDriveAccessToken()
  } catch {
    return adminJsonError(
      "Google Drive is not connected. Please reconnect your Google account to enable file uploads.",
      503,
    )
  }

  const origin = request.headers.get("origin") ?? undefined

  try {
    let folderId: string

    if (
      entityRow.propertyListId != null &&
      entityRow.streetAddress &&
      entityRow.suburb &&
      entityRow.state &&
      entityRow.postcode
    ) {
      const propertyFolderName = buildPropertyFolderName(
        entityRow.streetAddress,
        entityRow.suburb,
        entityRow.state,
        entityRow.postcode,
      )
      const propertyFolderId = await getOrCreateDriveFolder(
        accessToken,
        propertyFolderName,
        PANDA_DRIVE_PARENT_FOLDER_ID,
      )
      folderId = await getOrCreateDriveFolder(accessToken, entityRow.entityName, propertyFolderId)
    } else {
      folderId = await getOrCreateDriveFolder(accessToken, entityRow.entityName, PANDA_DRIVE_PARENT_FOLDER_ID)
    }

    const uploadUri = await initiateResumableUpload(accessToken, fileName, mimeType, fileSize, origin, folderId)
    return NextResponse.json({ uploadUri })
  } catch (err) {
    return adminJsonError(
      `Failed to initiate Drive upload: ${err instanceof Error ? err.message : String(err)}`,
      502,
    )
  }
}
