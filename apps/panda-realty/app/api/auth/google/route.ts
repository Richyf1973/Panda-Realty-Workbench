import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
].join(" ")

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return adminJsonError("GOOGLE_CLIENT_ID or GOOGLE_OAUTH_REDIRECT_URI is not configured", 500)
  }

  const { searchParams } = new URL(request.url)
  const rawReturnTo = searchParams.get("returnTo") ?? ""
  const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/admin/properties"

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: returnTo,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
}
