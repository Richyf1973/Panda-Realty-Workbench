import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { getGmailAccessToken, getGmailThreadMessages } from "@/lib/gmail-client"
import { getSessionUser } from "@/lib/auth/session"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const threadId = searchParams.get("threadId")?.trim()
  if (!threadId) return adminJsonError("threadId is required", 400)

  try {
    const accessToken = await getGmailAccessToken()
    const { messages } = await getGmailThreadMessages(accessToken, threadId)
    return NextResponse.json({ messages })
  } catch (cause) {
    console.error("[GET /api/admin/gmail/threads/body]", cause)
    const message = cause instanceof Error ? cause.message : "Failed to load thread body"
    return adminJsonError(message, 500)
  }
}
