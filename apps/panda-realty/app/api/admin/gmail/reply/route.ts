import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { db } from "@/db"
import { propertyThreadTags } from "@/db/schema"

import { getSessionUser } from "@/lib/auth/session"
import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"
import {
  getGmailAccessToken,
  getGmailThreadReplyMetadata,
  sendGmailReply,
} from "@/lib/gmail-client"
import { getDriveAccessToken, downloadDriveFile } from "@/lib/google-drive-client"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (e) {
    console.error("[gmail/reply] formData parse error:", e)
    return adminJsonError("Invalid request body", 400)
  }

  const threadId = (formData.get("threadId") as string | null)?.trim() ?? ""
  const messageId = (formData.get("messageId") as string | null)?.trim() ?? ""
  const fallbackTo = (formData.get("to") as string | null)?.trim() ?? ""
  const subject = (formData.get("subject") as string | null) ?? ""
  const bodyHtml = normalizeEmailSignatureHtml((formData.get("bodyHtml") as string | null) ?? "")
  const cc = (formData.get("cc") as string | null)?.trim() || undefined
  const bcc = (formData.get("bcc") as string | null)?.trim() || undefined
  const driveFileIds = formData.getAll("driveFileIds").filter((v): v is string => typeof v === "string" && v.length > 0)
  const rawPropertyListId = formData.get("propertyListId") as string | null
  const propertyListId = rawPropertyListId ? Number(rawPropertyListId) : null

  if (!threadId) return adminJsonError("Missing required field: threadId", 400)
  if (!messageId) return adminJsonError("Missing required field: messageId", 400)
  if (!fallbackTo) return adminJsonError("Missing required field: to", 400)

  let gmailToken: string
  try {
    gmailToken = await getGmailAccessToken()
  } catch (e) {
    console.error("[gmail/reply] accessToken error:", e)
    return adminJsonError(
      "Gmail is not connected. Please connect your Google account.",
      503,
    )
  }

  let attachments: { name: string; mimeType: string; data: Buffer }[] = []
  if (driveFileIds.length > 0) {
    let driveToken: string
    try {
      driveToken = await getDriveAccessToken()
    } catch {
      return adminJsonError("Google Drive is not connected. Please reconnect your Google account.", 503)
    }
    try {
      attachments = await Promise.all(driveFileIds.map((id) => downloadDriveFile(driveToken, id)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch attachments from Drive"
      return adminJsonError(message, 502)
    }
  }

  let resolvedThreadId: string
  try {
    const replyMetadata = await getGmailThreadReplyMetadata(gmailToken, threadId, messageId)
    const result = await sendGmailReply(gmailToken, {
      threadId,
      to: replyMetadata.to || fallbackTo,
      subject,
      bodyHtml,
      cc,
      bcc,
      referenceMessageId: replyMetadata.referenceMessageId,
      references: replyMetadata.references,
      attachments,
    })
    resolvedThreadId = result.threadId
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reply"
    return adminJsonError(message, 502)
  }

  if (propertyListId && !Number.isNaN(propertyListId) && resolvedThreadId) {
    try {
      await db.insert(propertyThreadTags).values({ propertyListId, threadId: resolvedThreadId }).onConflictDoNothing()
    } catch (err) {
      console.error("[gmail/reply] Failed to insert property_thread_tag:", err)
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
