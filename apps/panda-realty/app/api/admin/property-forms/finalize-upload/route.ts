import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
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

  const { googleDriveFileId, fileLink, fileName, fileSize: fileSizeRaw, fileType } =
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

  try {
    const accessToken = await getDriveAccessToken()
    await shareFilePublicly(accessToken, googleDriveFileId)
  } catch (err) {
    console.error("[POST /api/admin/property-forms/finalize-upload] Drive share failed", err)
  }

  return NextResponse.json({
    googleDriveFileId,
    fileLink,
    fileName,
    fileSize,
    fileType: typeof fileType === "string" ? fileType : "application/octet-stream",
  })
}
