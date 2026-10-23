import "server-only"

import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { db } from "@/db"
import { propertyListFiles } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { PANDA_MAX_OWNERS } from "@/lib/panda-drive-constants"
import type { PropertyDialogAggregateFileRow } from "@/lib/property-list-files-aggregate.types"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId) || propertyListId <= 0) return adminJsonError("Invalid id", 400)

  const url = new URL(request.url)
  const ownerNumRaw = url.searchParams.get("ownerNum")
  const ownerNum = ownerNumRaw != null ? parseInt(ownerNumRaw, 10) : null
  if (ownerNum == null || isNaN(ownerNum) || ownerNum < 1 || ownerNum > PANDA_MAX_OWNERS) {
    return adminJsonError(`ownerNum must be 1, 2, or ${PANDA_MAX_OWNERS}`, 400)
  }

  try {
    const rows = await db
      .select()
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListId, propertyListId),
          eq(propertyListFiles.ownerNum, ownerNum),
        ),
      )
      .orderBy(desc(propertyListFiles.createdAt), desc(propertyListFiles.propertyListFileId))

    const items: PropertyDialogAggregateFileRow[] = rows.map((r) => ({
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
      sourceLabel: `Owner ${ownerNum}`,
      sharedWithPortal: r.sharedWithPortal,
      sharedWithSeller: r.sharedWithSeller,
    }))

    return NextResponse.json({ items })
  } catch {
    return adminJsonError("Failed to fetch owner files", 500)
  }
}
