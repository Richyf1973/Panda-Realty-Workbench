import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { getDriveAccessToken, initiateResumableUpload } from "@/lib/google-drive-client"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const { fileName, mimeType, fileSize } = body as Record<string, unknown>

  if (typeof fileName !== "string" || fileName.trim() === "") {
    return adminJsonError("Missing required field: fileName", 400)
  }
  if (typeof mimeType !== "string" || mimeType.trim() === "") {
    return adminJsonError("Missing required field: mimeType", 400)
  }
  if (typeof fileSize !== "number" || fileSize <= 0) {
    return adminJsonError("Missing or invalid field: fileSize", 400)
  }

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
    const uploadUri = await initiateResumableUpload(accessToken, fileName, mimeType, fileSize, origin)
    return NextResponse.json({ uploadUri })
  } catch (err) {
    return adminJsonError(
      `Failed to initiate Drive upload: ${err instanceof Error ? err.message : String(err)}`,
      502,
    )
  }
}
