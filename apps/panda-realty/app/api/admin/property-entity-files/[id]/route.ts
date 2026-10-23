import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyEntities, propertyEntityFiles } from "@/db/schema"
import { getDriveAccessToken, deleteFileFromDrive } from "@/lib/google-drive-client"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const fileId = Number(id)
  if (!Number.isFinite(fileId) || fileId <= 0) return adminJsonError("Invalid id", 400)

  const body = await request.json().catch(() => null)
  if (body == null || (typeof body.sharedWithPortal !== "boolean" && typeof body.sharedWithSeller !== "boolean")) {
    return adminJsonError("sharedWithPortal or sharedWithSeller (boolean) required", 400)
  }

  await db
    .update(propertyEntityFiles)
    .set({
      ...(typeof body.sharedWithPortal === "boolean" ? { sharedWithPortal: body.sharedWithPortal } : {}),
      ...(typeof body.sharedWithSeller === "boolean" ? { sharedWithSeller: body.sharedWithSeller } : {}),
    })
    .where(eq(propertyEntityFiles.propertyEntityFileId, fileId))

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const fileId = Number(id)
  if (!Number.isFinite(fileId) || fileId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  const { searchParams } = new URL(request.url)
  const propertyListIdParam = searchParams.get("propertyListId")
  const propertyListId =
    propertyListIdParam != null && propertyListIdParam.trim() !== ""
      ? Number(propertyListIdParam)
      : null

  if (propertyListId != null) {
    if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
      return adminJsonError("Invalid propertyListId query param", 400)
    }
  }

  const [row] = await db
    .select()
    .from(propertyEntityFiles)
    .where(eq(propertyEntityFiles.propertyEntityFileId, fileId))
    .limit(1)

  if (!row) return adminJsonError("Not found", 404)

  if (propertyListId != null) {
    const [link] = await db
      .select({ propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, row.propertyEntityId))
      .limit(1)
    if (!link?.propertyListId || link.propertyListId !== propertyListId) {
      return adminJsonError("File does not belong to this property", 403)
    }
  }

  // Delete from Google Drive if we have a Drive file ID
  if (row.googleDriveFileId) {
    try {
      const accessToken = await getDriveAccessToken()
      await deleteFileFromDrive(accessToken, row.googleDriveFileId)
    } catch (err) {
      console.error("[DELETE /api/admin/property-entity-files/[id]] Drive delete failed", err)
      // Continue to delete the DB record even if Drive deletion fails
    }
  }

  await db
    .delete(propertyEntityFiles)
    .where(eq(propertyEntityFiles.propertyEntityFileId, fileId))

  return NextResponse.json({ ok: true })
}
