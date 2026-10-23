import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { getGmailAccessToken, listGmailThreads } from "@/lib/gmail-client"
import { getSessionUser } from "@/lib/auth/session"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")?.trim()
  if (!email) return adminJsonError("email is required", 400)

  try {
    const accessToken = await getGmailAccessToken()
    const threads = await listGmailThreads(accessToken, `from:"${email}" OR to:"${email}" OR "${email}"`)
    return NextResponse.json({ threads })
  } catch (cause) {
    console.error("[GET /api/admin/gmail/threads]", cause)
    const message = cause instanceof Error ? cause.message : "Failed to load threads"
    return adminJsonError(message, 500)
  }
}
