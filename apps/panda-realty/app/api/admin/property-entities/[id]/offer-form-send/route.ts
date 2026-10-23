import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { propertyEntities, entities, pandaProperties } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { escapeHtml } from "@/lib/html-utils"
import { buildOfferEmailSubject } from "@/lib/offer-email-subject"
import { getOrCreateOfferFormToken } from "@/lib/offer-form-token.server"
import { resolveEffectiveOrigin } from "@/lib/portal-notifications"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyEntityId = parseInt(id, 10)
  if (isNaN(propertyEntityId)) return adminJsonError("Invalid id", 400)

  try {
    const [pe] = await db
      .select({
        propertyListId: propertyEntities.propertyListId,
        entityId: propertyEntities.entityId,
      })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)

    if (!pe) return adminJsonError("Property entity not found", 404)

    const [entityRow] = await db
      .select({
        entityName: entities.entityName,
        emailAddress: entities.emailAddress,
      })
      .from(entities)
      .where(eq(entities.entityId, pe.entityId))
      .limit(1)

    if (!entityRow?.emailAddress) {
      return adminJsonError("Buyer has no email address", 422)
    }

    const token = await getOrCreateOfferFormToken(propertyEntityId, pe.propertyListId!)

    const origin = resolveEffectiveOrigin(new URL(request.url).origin)
    const formUrl = `${origin}/offer-form/${token.token}`

    const [property] = await db
      .select({
        streetAddress: pandaProperties.streetAddress,
        suburb: pandaProperties.suburb,
      })
      .from(pandaProperties)
      .where(eq(pandaProperties.propertyListId, pe.propertyListId!))
      .limit(1)

    const propertyLabel = property
      ? [property.streetAddress, property.suburb].filter(Boolean).join(", ")
      : null

    let accessToken: string
    try {
      accessToken = await getGmailAccessToken()
    } catch {
      return adminJsonError(
        "Gmail is not connected. Please reconnect your Google account to enable email sending.",
        503,
      )
    }

    const subject = buildOfferEmailSubject(entityRow.entityName, propertyLabel)

    const bodyHtml = [
      `<p>Hi ${escapeHtml(entityRow.entityName ?? "")},</p>`,
      `<p>Please fill in your offer details using the link below:</p>`,
      `<p><a href="${formUrl}">${escapeHtml(formUrl)}</a></p>`,
      `<p>Thank you,<br>Panda Realty</p>`,
    ].join("\n")

    await sendGmailMessage(accessToken, entityRow.emailAddress, subject, bodyHtml)

    return NextResponse.json({ ok: true, formUrl }, { status: 200 })
  } catch (cause) {
    console.error(`[POST /api/admin/property-entities/${propertyEntityId}/offer-form-send]`, cause)
    return adminJsonError("Failed to send offer form email", 500)
  }
}
