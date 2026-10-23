import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { gmailOauthTokens } from "@/db/schema"

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  })

  if (!res.ok) {
    throw new Error("Failed to refresh Gmail access token")
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

// In-process singleton: collapses concurrent refresh calls into one round-trip.
let refreshPromise: Promise<string> | null = null

export async function getGmailAccessToken(): Promise<string> {
  const [token] = await db.select().from(gmailOauthTokens).where(eq(gmailOauthTokens.id, 1)).limit(1)

  if (!token) {
    throw new Error("Gmail is not connected. Please connect your Gmail account first.")
  }

  if (token.expiresAt.getTime() < Date.now() + 60_000) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshed = await refreshAccessToken(token.refreshToken)
          await db
            .update(gmailOauthTokens)
            .set({ accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt, updatedAt: new Date() })
            .where(eq(gmailOauthTokens.id, 1))
          return refreshed.accessToken
        } finally {
          refreshPromise = null
        }
      })()
    }
    return refreshPromise
  }

  return token.accessToken
}

export async function isGmailConnected(): Promise<boolean> {
  const [token] = await db.select({ id: gmailOauthTokens.id }).from(gmailOauthTokens).limit(1)
  return Boolean(token)
}
