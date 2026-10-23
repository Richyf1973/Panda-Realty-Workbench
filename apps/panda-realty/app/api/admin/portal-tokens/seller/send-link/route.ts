import "server-only"

import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { pandaProperties, portalLinkSends, portalTokens } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { escapeHtml } from "@/lib/html-utils"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { resolveEffectiveOrigin } from "@/lib/portal-notifications"
import { resolveSellerPrimaryOwner } from "@/lib/seller-primary-owner"

const bodySchema = z.object({
  propertyListId: z.number().int(),
})

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON", 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return adminJsonError("propertyListId is required integer", 400)

  const { propertyListId } = parsed.data

  const [property] = await db
    .select({
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      owner1name: pandaProperties.owner1name,
      owner1email: pandaProperties.owner1email,
      owner2name: pandaProperties.owner2name,
      owner2email: pandaProperties.owner2email,
      owner3name: pandaProperties.owner3name,
      owner3email: pandaProperties.owner3email,
      primaryEmailOwnerNum: pandaProperties.primaryEmailOwnerNum,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!property) return adminJsonError("Property not found", 404)

  const primary = resolveSellerPrimaryOwner(property)
  if (!primary) return adminJsonError("No seller email on record", 422)

  const recipientEmail = primary.email
  const recipientName = primary.name

  // Check for active portal token before spending a Gmail auth round-trip
  const [token] = await db
    .select({ portalTokenId: portalTokens.portalTokenId, token: portalTokens.token })
    .from(portalTokens)
    .where(
      and(
        eq(portalTokens.propertyListId, propertyListId),
        eq(portalTokens.role, "seller"),
        isNull(portalTokens.revokedAt),
      ),
    )
    .limit(1)

  if (!token) return adminJsonError("No active seller portal link found", 404)

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch {
    return adminJsonError(
      "Gmail is not connected. Please reconnect your Google account to enable email sending.",
      503,
    )
  }

  const origin = resolveEffectiveOrigin(new URL(request.url).origin)
  const portalUrl = `${origin}/portal/seller/${token.token}`
  const propertyAddress = [property.streetAddress, property.suburb].filter(Boolean).join(", ")
  const subject = `Your seller portal${propertyAddress ? ` — ${propertyAddress}` : ""}`

  const bodyHtml = [
    `<p>Hi ${escapeHtml(recipientName ?? "")},</p>`,
    `<p>Here is your seller portal${propertyAddress ? ` for <strong>${escapeHtml(propertyAddress)}</strong>` : ""}.</p>`,
    `<p>You can view listing updates and documents at any time.</p>`,
    `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Access your seller portal →</a></p>`,
    `<p>Thank you,<br>Panda Realty</p>`,
  ].join("\n")

  try {
    await sendGmailMessage(accessToken, recipientEmail, subject, bodyHtml)
  } catch {
    return adminJsonError("Failed to send email. Please try again.", 500)
  }

  await db.insert(portalLinkSends).values({
    propertyListId,
    portalTokenId: token.portalTokenId,
    recipientEmail,
    recipientName,
  })

  return NextResponse.json({ recipientEmail })
}
