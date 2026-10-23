import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties, propertyListFiles } from "@/db/schema"
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
    propertyListId: propertyListIdRaw,
    ownerNum: ownerNumRaw,
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
  const propertyListId = Number(propertyListIdRaw)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Missing or invalid field: propertyListId", 400)
  }

  const ownerNum =
    ownerNumRaw != null && ownerNumRaw !== ""
      ? Number(ownerNumRaw)
      : null
  const ownerNumValid = ownerNum === null || (Number.isInteger(ownerNum) && ownerNum >= 1 && ownerNum <= 3)
  if (!ownerNumValid) {
    return adminJsonError("Invalid field: ownerNum must be 1, 2, or 3", 400)
  }

  const [prop] = await db
    .select({ id: pandaProperties.propertyListId })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!prop) return adminJsonError("Property not found", 404)

  let shareWarning: string | undefined
  try {
    const accessToken = await getDriveAccessToken()
    await shareFilePublicly(accessToken, googleDriveFileId)
  } catch (err) {
    console.error("[POST /api/admin/property-list-files/record-upload] Drive share failed", err)
    shareWarning = err instanceof Error ? err.message : String(err)
  }

  try {
    const [inserted] = await db
      .insert(propertyListFiles)
      .values({
        propertyListId,
        fileType,
        fileLink,
        fileName,
        fileSize,
        googleDriveFileId,
        ownerNum,
      })
      .returning()

    return NextResponse.json({ ...inserted, ...(shareWarning ? { shareWarning } : {}) }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/property-list-files/record-upload] DB insert failed", err)
    return adminJsonError(
      `Failed to save file record: ${err instanceof Error ? err.message : String(err)}`,
      500,
    )
  }
}
