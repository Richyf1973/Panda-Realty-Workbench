import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { propertyThreadTags } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"
import { fetchGmailAttachmentBytes, getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { getDriveAccessToken, downloadDriveFile } from "@/lib/google-drive-client"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (e) {
    console.error("[gmail/forward] formData parse error:", e)
    return adminJsonError("Invalid request body", 400)
  }

  const to = (formData.get("to") as string | null)?.trim() ?? ""
  const subject = (formData.get("subject") as string | null) ?? ""
  const bodyHtml = normalizeEmailSignatureHtml((formData.get("bodyHtml") as string | null) ?? "")
  const messageId = (formData.get("messageId") as string | null)?.trim() ?? ""
  const attachmentIds = formData
    .getAll("attachmentId")
    .filter((v): v is string => typeof v === "string" && v.length > 0)
  const attachmentFilenames = formData
    .getAll("attachmentFilename")
    .filter((v): v is string => typeof v === "string")
  const attachmentMimeTypes = formData
    .getAll("attachmentMimeType")
    .filter((v): v is string => typeof v === "string")
  const driveFileIds = formData
    .getAll("driveFileIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0)
  const rawPropertyListId = formData.get("propertyListId") as string | null
  const propertyListId = rawPropertyListId ? Number(rawPropertyListId) : null

  if (!to) return adminJsonError("Missing required field: to", 400)

  let gmailToken: string
  try {
    gmailToken = await getGmailAccessToken()
  } catch (e) {
    console.error("[gmail/forward] accessToken error:", e)
    return adminJsonError("Gmail is not connected. Please connect your Google account.", 503)
  }

  const attachments: { name: string; mimeType: string; data: Buffer }[] = []

  if (attachmentIds.length > 0) {
    if (!messageId) return adminJsonError("messageId is required when attachmentId is provided", 400)
    try {
      const gmailAttachments = await Promise.all(
        attachmentIds.map(async (attachmentId, i) => {
          const data = await fetchGmailAttachmentBytes(gmailToken, messageId, attachmentId)
          return {
            name: attachmentFilenames[i] ?? attachmentId,
            mimeType: attachmentMimeTypes[i] ?? "application/octet-stream",
            data,
          }
        }),
      )
      attachments.push(...gmailAttachments)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch original attachments"
      return adminJsonError(message, 502)
    }
  }

  if (driveFileIds.length > 0) {
    let driveToken: string
    try {
      driveToken = await getDriveAccessToken()
    } catch {
      return adminJsonError("Google Drive is not connected. Please reconnect your Google account.", 503)
    }
    try {
      const driveAttachments = await Promise.all(driveFileIds.map((id) => downloadDriveFile(driveToken, id)))
      attachments.push(...driveAttachments)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch attachments from Drive"
      return adminJsonError(message, 502)
    }
  }

  let threadId: string
  try {
    ;({ threadId } = await sendGmailMessage(gmailToken, to, subject, bodyHtml, attachments))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to forward email"
    return adminJsonError(message, 502)
  }

  if (propertyListId && !Number.isNaN(propertyListId)) {
    try {
      await db.insert(propertyThreadTags).values({ propertyListId, threadId }).onConflictDoNothing()
    } catch (err) {
      console.error("[gmail/forward] failed to insert property_thread_tag:", err)
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
