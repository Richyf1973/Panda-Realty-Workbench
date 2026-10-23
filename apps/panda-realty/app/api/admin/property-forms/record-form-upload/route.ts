import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyForms } from "@/db/schema"
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

  const { googleDriveFileId, fileLink, fileName, fileSize: fileSizeRaw } =
    body as Record<string, unknown>

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

  const formName = fileName.replace(/\.[^.]+$/, "")

  try {
    const accessToken = await getDriveAccessToken()
    await shareFilePublicly(accessToken, googleDriveFileId)
  } catch (err) {
    console.error("[POST /api/admin/property-forms/record-form-upload] Drive share failed", err)
  }

  try {
    const [inserted] = await db
      .insert(propertyForms)
      .values({
        formName,
        fileLink,
        fileName,
        fileSize,
        googleDriveFileId,
        isActive: true,
      })
      .returning()

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[POST /api/admin/property-forms/record-form-upload] DB insert failed", err)
    return adminJsonError(
      `Failed to save form record: ${err instanceof Error ? err.message : String(err)}`,
      500,
    )
  }
}
