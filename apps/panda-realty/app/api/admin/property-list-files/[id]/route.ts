import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyListFiles } from "@/db/schema"
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
    .update(propertyListFiles)
    .set({
      ...(typeof body.sharedWithPortal === "boolean" ? { sharedWithPortal: body.sharedWithPortal } : {}),
      ...(typeof body.sharedWithSeller === "boolean" ? { sharedWithSeller: body.sharedWithSeller } : {}),
    })
    .where(eq(propertyListFiles.propertyListFileId, fileId))

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const fileId = Number(id)
  if (!Number.isFinite(fileId) || fileId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  const [row] = await db
    .select()
    .from(propertyListFiles)
    .where(eq(propertyListFiles.propertyListFileId, fileId))
    .limit(1)

  if (!row) return adminJsonError("Not found", 404)

  if (row.googleDriveFileId) {
    try {
      const accessToken = await getDriveAccessToken()
      await deleteFileFromDrive(accessToken, row.googleDriveFileId)
    } catch (err) {
      console.error("[DELETE /api/admin/property-list-files/[id]] Drive delete failed", err)
    }
  }

  await db
    .delete(propertyListFiles)
    .where(eq(propertyListFiles.propertyListFileId, fileId))

  return NextResponse.json({ ok: true })
}
