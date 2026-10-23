import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { getSessionUser } from "@/lib/auth/session"
import { getDriveAccessToken, findOrCreateEmailAttachmentsFolder, initiateResumableUpload } from "@/lib/google-drive-client"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let fileName: string
  let mimeType: string
  let fileSize: number
  try {
    const body = (await request.json()) as { fileName?: string; mimeType?: string; fileSize?: number }
    fileName = body.fileName?.trim() ?? ""
    mimeType = body.mimeType?.trim() || "application/octet-stream"
    fileSize = typeof body.fileSize === "number" ? body.fileSize : 0
    if (!fileName) return adminJsonError("Missing required field: fileName", 400)
    if (fileSize <= 0) return adminJsonError("Missing or invalid field: fileSize", 400)
  } catch {
    return adminJsonError("Invalid request body", 400)
  }

  let accessToken: string
  try {
    accessToken = await getDriveAccessToken()
  } catch {
    return adminJsonError(
      "Google Drive is not connected. Please connect your Google account.",
      503,
    )
  }

  let folderId: string
  try {
    folderId = await findOrCreateEmailAttachmentsFolder(accessToken)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to prepare Drive folder"
    return adminJsonError(message, 502)
  }

  const origin = request.headers.get("origin") ?? undefined

  let uploadUri: string
  try {
    uploadUri = await initiateResumableUpload(accessToken, fileName, mimeType, fileSize, origin, folderId)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initiate Drive upload"
    return adminJsonError(message, 502)
  }

  return NextResponse.json({ uploadUri }, { status: 200 })
}
