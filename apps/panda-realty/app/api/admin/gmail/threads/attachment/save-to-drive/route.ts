import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { pandaProperties, propertyEntityFiles, propertyListFiles } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { getGmailAccessToken } from "@/lib/gmail-client"
import {
  getDriveAccessToken,
  getOrCreateDriveFolder,
  listFilesInFolder,
  shareFilePublicly,
  uploadFileToDrive,
} from "@/lib/google-drive-client"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"

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
    messageId,
    attachmentId,
    filename,
    mimeType,
    propertyListId: propertyListIdRaw,
    propertyEntityId: propertyEntityIdRaw,
    entityName,
    ownerNum: ownerNumRaw,
  } = body as Record<string, unknown>

  if (typeof messageId !== "string" || !messageId.trim()) return adminJsonError("messageId is required", 400)
  if (typeof attachmentId !== "string" || !attachmentId.trim()) return adminJsonError("attachmentId is required", 400)
  if (typeof filename !== "string" || !filename.trim()) return adminJsonError("filename is required", 400)
  if (typeof mimeType !== "string" || !mimeType.trim()) return adminJsonError("mimeType is required", 400)

  const propertyListId = Number(propertyListIdRaw)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("propertyListId is required", 400)
  }

  const propertyEntityId =
    propertyEntityIdRaw != null ? Number(propertyEntityIdRaw) : null
  const entityNameStr = typeof entityName === "string" ? entityName.trim() : null
  const ownerNum =
    ownerNumRaw != null ? Number(ownerNumRaw) : null

  // Fetch property address for Drive folder name
  const [prop] = await db
    .select({
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!prop) return adminJsonError("Property not found", 404)
  if (!prop.streetAddress || !prop.suburb || !prop.state || !prop.postcode) {
    return adminJsonError("Property address is incomplete", 422)
  }

  try {
    // Fetch attachment bytes from Gmail
    const gmailToken = await getGmailAccessToken()
    const gmailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { headers: { Authorization: `Bearer ${gmailToken}` } },
    )
    if (!gmailRes.ok) {
      const text = await gmailRes.text().catch(() => "")
      return adminJsonError(text || `Gmail attachment fetch failed (${gmailRes.status})`, gmailRes.status)
    }
    const gmailData = (await gmailRes.json()) as { data?: string; size?: number }
    const bytes = Buffer.from(gmailData.data ?? "", "base64url")
    if (bytes.length === 0) return adminJsonError("Attachment data is empty", 422)
    const fileSize = bytes.length

    // Build Drive folder hierarchy
    const driveToken = await getDriveAccessToken()
    const propertyFolderName = buildPropertyFolderName(
      prop.streetAddress,
      prop.suburb,
      prop.state,
      prop.postcode,
    )
    const propertyFolderId = await getOrCreateDriveFolder(driveToken, propertyFolderName, PANDA_DRIVE_PARENT_FOLDER_ID)

    const subfolderName = entityNameStr ?? null
    const targetFolderId = subfolderName
      ? await getOrCreateDriveFolder(driveToken, subfolderName, propertyFolderId)
      : propertyFolderId

    // Dedup: check existing files by filename + size
    const existingFiles = await listFilesInFolder(driveToken, targetFolderId)
    const duplicate = existingFiles.find(
      (f) => f.name === filename && Number(f.size) === fileSize,
    )
    if (duplicate) {
      return NextResponse.json({
        saved: false,
        alreadyExists: true,
        webViewLink: duplicate.webViewLink ?? null,
      })
    }

    // Upload to Drive
    const { fileId, webViewLink } = await uploadFileToDrive(
      driveToken,
      bytes.buffer as ArrayBuffer,
      filename,
      mimeType,
      targetFolderId,
    )

    // Share publicly
    await shareFilePublicly(driveToken, fileId)

    // Record in DB
    if (propertyEntityId != null && propertyEntityId > 0) {
      await db.insert(propertyEntityFiles).values({
        propertyEntityId,
        fileName: filename,
        fileSize,
        fileType: mimeType,
        fileLink: webViewLink,
        googleDriveFileId: fileId,
        source: "google_drive",
      })
    } else {
      await db.insert(propertyListFiles).values({
        propertyListId,
        fileName: filename,
        fileSize,
        fileType: mimeType,
        fileLink: webViewLink,
        googleDriveFileId: fileId,
        ownerNum: ownerNum as 1 | 2 | 3 | null,
        source: "google_drive",
      })
    }

    return NextResponse.json({ saved: true, alreadyExists: false, webViewLink })
  } catch (cause) {
    console.error("[POST /api/admin/gmail/threads/attachment/save-to-drive]", cause)
    const message = cause instanceof Error ? cause.message : "Failed to save attachment to Drive"
    return adminJsonError(message, 500)
  }
}
