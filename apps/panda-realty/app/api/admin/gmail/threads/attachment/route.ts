import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { getGmailAccessToken } from "@/lib/gmail-client"
import { getSessionUser } from "@/lib/auth/session"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const messageId = searchParams.get("messageId")?.trim()
  const attachmentId = searchParams.get("attachmentId")?.trim()
  const filename = (searchParams.get("filename")?.trim() || "attachment").replace(/["\r\n\\]/g, "_")
  const mimeType = searchParams.get("mimeType")?.trim() || "application/octet-stream"
  const disposition = searchParams.get("disposition")?.trim().toLowerCase() === "inline" ? "inline" : "attachment"

  if (!messageId || !attachmentId) {
    return adminJsonError("messageId and attachmentId are required", 400)
  }

  try {
    const accessToken = await getGmailAccessToken()
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return adminJsonError(text || `Failed to load attachment (${res.status})`, res.status)
    }

    const data = (await res.json()) as { data?: string; size?: number }
    const bytes = Buffer.from(data.data ?? "", "base64url")

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=0, no-store",
      },
    })
  } catch (cause) {
    console.error("[GET /api/admin/gmail/threads/attachment]", cause)
    const message = cause instanceof Error ? cause.message : "Failed to load attachment"
    return adminJsonError(message, 500)
  }
}
