import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyEntityFiles } from "@/db/schema"
import { getDriveAccessToken, shareFilePublicly } from "@/lib/google-drive-client"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const {
    googleDriveFileId,
    fileLink,
    fileName,
    fileSize: fileSizeRaw,
    fileType,
    propertyEntityId: propertyEntityIdRaw,
  } = body as Record<string, unknown>

  if (typeof googleDriveFileId !== "string" || googleDriveFileId.trim() === "") {
    return adminJsonError("Missing required field: googleDriveFileId", 400)
  }
  if (typeof fileLink !== "string" || fileLink.trim() === "") {
    return adminJsonError("Missing required field: fileLink", 400)
  }
  if (typeof fileName !== "string" || fileName.trim() === "") {
    return adminJsonError("Missing required field: fileName", 400)
  }
  const fileSize = Number(fileSizeRaw)
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return adminJsonError("Missing or invalid field: fileSize", 400)
  }
  if (typeof fileType !== "string" || fileType.trim() === "") {
    return adminJsonError("Missing required field: fileType", 400)
  }
  const propertyEntityId = Number(propertyEntityIdRaw)
  if (!Number.isFinite(propertyEntityId) || propertyEntityId <= 0) {
    return adminJsonError("Missing or invalid field: propertyEntityId", 400)
  }

  let shareWarning: string | undefined
  try {
    const accessToken = await getDriveAccessToken()
    await shareFilePublicly(accessToken, googleDriveFileId)
  } catch (err) {
    console.error("[POST /api/admin/property-entity-files/record-upload] Drive share failed", err)
    shareWarning = err instanceof Error ? err.message : String(err)
  }

  try {
    const [inserted] = await db
      .insert(propertyEntityFiles)
      .values({
        propertyEntityId,
        fileType,
        fileLink,
        fileName,
        fileSize,
        googleDriveFileId,
      })
      .returning()

    return NextResponse.json({ ...inserted, ...(shareWarning ? { shareWarning } : {}) }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/property-entity-files/record-upload] DB insert failed", err)
    return adminJsonError(
      `Failed to save file record: ${err instanceof Error ? err.message : String(err)}`,
      500,
    )
  }
}
