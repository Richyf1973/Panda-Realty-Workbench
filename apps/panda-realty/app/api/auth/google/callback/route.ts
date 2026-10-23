import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { gmailOauthTokens } from "@/db/schema"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawState = searchParams.get("state") ?? ""
  const returnTo = rawState.startsWith("/") && !rawState.startsWith("//") ? rawState : "/admin/properties"

  const redirect = (param: string, value: string) => {
    const sep = returnTo.includes("?") ? "&" : "?"
    return NextResponse.redirect(`${origin}${returnTo}${sep}${param}=${value}`)
  }

  if (!code) return redirect("gmailError", "no_code")

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) return redirect("gmailError", "misconfigured")

  // Exchange auth code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })

  if (!tokenRes.ok) return redirect("gmailError", "token_exchange_failed")

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in: number
    scope: string
  }

  if (!tokens.refresh_token) {
    // refresh_token is only returned on first consent — user may need to revoke and reconnect
    return redirect("gmailError", "no_refresh_token")
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  // Upsert — singleton row (id = 1)
  await db
    .insert(gmailOauthTokens)
    .values({
      id: 1,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      expiresAt,
      scope: tokens.scope,
    })
    .onConflictDoUpdate({
      target: gmailOauthTokens.id,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenType: tokens.token_type,
        expiresAt,
        scope: tokens.scope,
        updatedAt: new Date(),
      },
    })

  return redirect("gmailConnected", "1")
}
