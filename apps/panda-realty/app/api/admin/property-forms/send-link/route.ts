import "server-only"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { adminJsonError } from "@repo/admin/admin-api"
import { db } from "@/db"
import { entities, pandaProperties, propertyEntities, propertyFormSends } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { escapeHtml } from "@/lib/html-utils"
import { getOrCreateOfferFormToken } from "@/lib/offer-form-token.server"
import { resolveEffectiveOrigin } from "@/lib/portal-notifications"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: { propertyFormId: number; propertyListId: number; propertyEntityIds: number[]; buyerOfferIds?: Record<number, number> }
  try {
    const raw = (await request.json()) as Record<string, unknown>
    if (typeof raw.propertyFormId !== "number") return adminJsonError("propertyFormId required", 422)
    if (typeof raw.propertyListId !== "number") return adminJsonError("propertyListId required", 422)
    if (!Array.isArray(raw.propertyEntityIds) || raw.propertyEntityIds.length === 0)
      return adminJsonError("propertyEntityIds must be non-empty array", 422)
    if (!(raw.propertyEntityIds as unknown[]).every((id) => typeof id === "number" && Number.isInteger(id)))
      return adminJsonError("propertyEntityIds must be an array of integers", 422)
    body = raw as typeof body
  } catch {
    return adminJsonError("Invalid request body", 400)
  }

  const { propertyFormId, propertyListId, propertyEntityIds, buyerOfferIds } = body

  try {
    const [property] = await db
      .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
      .from(pandaProperties)
      .where(eq(pandaProperties.propertyListId, propertyListId))
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

    const origin = resolveEffectiveOrigin(new URL(request.url).origin)
    const subject = `Offer Form${propertyLabel ? ` — ${propertyLabel}` : ""}`
    const sent: number[] = []
    const failures: string[] = []

    for (const propertyEntityId of propertyEntityIds) {
      try {
        const [pe] = await db
          .select({ entityId: propertyEntities.entityId })
          .from(propertyEntities)
          .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
          .limit(1)

        if (!pe) { failures.push(`Property entity ${propertyEntityId} not found`); continue }

        const [entityRow] = await db
          .select({ entityName: entities.entityName, emailAddress: entities.emailAddress })
          .from(entities)
          .where(eq(entities.entityId, pe.entityId))
          .limit(1)

        if (!entityRow?.emailAddress) { failures.push(`Buyer ${propertyEntityId} has no email`); continue }

        const tokenRow = await getOrCreateOfferFormToken(propertyEntityId, propertyListId)
        const perEntityOfferId = buyerOfferIds?.[propertyEntityId]
        const formUrl = `${origin}/offer-form/${tokenRow.token}${perEntityOfferId != null ? `?offerId=${perEntityOfferId}` : ""}`

        const bodyHtml = [
          `<p>Hi ${escapeHtml(entityRow.entityName ?? "")},</p>`,
          `<p>Please fill in your offer details using the link below:</p>`,
          `<p><a href="${formUrl}">${escapeHtml(formUrl)}</a></p>`,
          `<p>Thank you,<br>Panda Realty</p>`,
        ].join("\n")

        await sendGmailMessage(accessToken, entityRow.emailAddress, subject, bodyHtml)

        await db.insert(propertyFormSends).values({
          propertyFormId,
          propertyListId,
          entityId: pe.entityId,
          recipientEmail: entityRow.emailAddress,
          recipientName: entityRow.entityName ?? null,
          messageSent: null,
          driveFileLink: formUrl,
        })

        sent.push(propertyEntityId)
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err))
      }
    }

    return NextResponse.json({ sent: sent.length, failures }, { status: 200 })
  } catch (cause) {
    console.error("[POST /api/admin/property-forms/send-link]", cause)
    return adminJsonError("Failed to send offer form emails", 500)
  }
}
