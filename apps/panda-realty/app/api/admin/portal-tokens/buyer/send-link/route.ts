import "server-only"

import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entities, portalLinkSends, portalTokens, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { escapeHtml } from "@/lib/html-utils"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { resolveEffectiveOrigin } from "@/lib/portal-notifications"

const bodySchema = z.object({
  propertyEntityId: z.number().int(),
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
  if (!parsed.success) return adminJsonError("propertyEntityId is required integer", 400)

  const { propertyEntityId } = parsed.data

  const [link] = await db
    .select({
      entityName: entities.entityName,
      emailAddress: entities.emailAddress,
      propertyListId: propertyEntities.propertyListId,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
    .limit(1)

  if (!link) return adminJsonError("Property entity not found", 404)
  if (!link.emailAddress) return adminJsonError("No buyer email on record — please add an email in the buyer's profile", 422)

  const [token] = await db
    .select({ portalTokenId: portalTokens.portalTokenId, token: portalTokens.token })
    .from(portalTokens)
    .where(
      and(
        eq(portalTokens.propertyEntityId, propertyEntityId),
        isNull(portalTokens.revokedAt),
      ),
    )
    .limit(1)

  if (!token) return adminJsonError("No active buyer portal link found", 404)

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
  const portalUrl = `${origin}/portal/${token.token}`
  const subject = `Your buyer portal${link.entityName ? ` — ${link.entityName}` : ""}`

  const bodyHtml = [
    `<p>Hi ${escapeHtml(link.entityName ?? "")},</p>`,
    `<p>Here is the link to access your buyer portal.</p>`,
    `<p>You can view your property details, conditions, documents, and send messages at any time.</p>`,
    `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Access your buyer portal →</a></p>`,
    `<p>Thank you,<br>Panda Realty</p>`,
  ].join("\n")

  try {
    await sendGmailMessage(accessToken, link.emailAddress, subject, bodyHtml)
  } catch {
    return adminJsonError("Failed to send email. Please try again.", 500)
  }

  await db.insert(portalLinkSends).values({
    propertyListId: link.propertyListId ?? 0,
    portalTokenId: token.portalTokenId,
    recipientEmail: link.emailAddress,
    recipientName: link.entityName,
  })

  return NextResponse.json({ recipientEmail: link.emailAddress })
}
