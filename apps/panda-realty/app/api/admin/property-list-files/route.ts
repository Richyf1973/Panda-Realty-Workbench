import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

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
import type { PropertyDialogAggregateFileRow } from "@/lib/property-list-files-aggregate.types"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("propertyListId")
  const propertyListId = raw != null ? Number(raw) : NaN

  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Missing or invalid propertyListId query param", 400)
  }

  const [prop] = await db
    .select({ id: pandaProperties.propertyListId })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!prop) return adminJsonError("Property not found", 404)

  const [listRows, entityJoinRows] = await Promise.all([
    db
      .select()
      .from(propertyListFiles)
      .where(eq(propertyListFiles.propertyListId, propertyListId)),
    db
      .select({
        file: propertyEntityFiles,
        propertyEntityId: propertyEntities.propertyEntityId,
        entityName: entities.entityName,
        categoryName: entityCategories.entityCategoryName,
      })
      .from(propertyEntityFiles)
      .innerJoin(
        propertyEntities,
        eq(propertyEntityFiles.propertyEntityId, propertyEntities.propertyEntityId),
      )
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .innerJoin(
        entityCategories,
        eq(entities.entityCategoryId, entityCategories.entityCategoryId),
      )
      .where(eq(propertyEntities.propertyListId, propertyListId))
      .orderBy(propertyEntityFiles.propertyEntityFileId),
  ])

  const propertyItems: PropertyDialogAggregateFileRow[] = listRows.map((r) => ({
    kind: "property",
    id: r.propertyListFileId,
    propertyListFileId: r.propertyListFileId,
    fileName: r.fileName,
    fileType: r.fileType,
    fileSize: r.fileSize,
    fileLink: r.fileLink,
    googleDriveFileId: r.googleDriveFileId,
    source: r.source ?? null,
    createdAt: r.createdAt?.toISOString?.() ?? (r.createdAt as unknown as string) ?? null,
    sourceLabel: r.ownerNum != null ? `Owner ${r.ownerNum}` : "Property",
    sharedWithPortal: r.sharedWithPortal,
    sharedWithSeller: r.sharedWithSeller,
  }))

  const entityItems: PropertyDialogAggregateFileRow[] = entityJoinRows.map(({ file, propertyEntityId, entityName, categoryName }) => ({
    kind: "entity",
    id: file.propertyEntityFileId,
    propertyEntityFileId: file.propertyEntityFileId,
    propertyEntityId,
    fileName: file.fileName,
    fileType: file.fileType,
    fileSize: file.fileSize,
    fileLink: file.fileLink,
    googleDriveFileId: file.googleDriveFileId,
    source: file.source ?? null,
    createdAt: file.createdAt?.toISOString?.() ?? (file.createdAt as unknown as string) ?? null,
    sourceLabel: `${categoryName} — ${entityName}`,
    sharedWithPortal: file.sharedWithPortal,
    sharedWithSeller: file.sharedWithSeller,
  }))

  const items = [...propertyItems, ...entityItems].sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0
    if (tb !== ta) return tb - ta
    return b.id - a.id
  })

  return NextResponse.json({ items })
}
