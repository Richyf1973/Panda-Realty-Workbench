import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, propertyEntities, pandaProperties, entities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import {
  getCalendarAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar-client"
import { isGmailConnected } from "@/lib/gmail-client"

type RouteContext = { params: Promise<{ id: string }> }

function addDays(base: Date, days: number): Date {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days),
  )
}

async function syncEvent(
  accessToken: string,
  existingEventId: string | null,
  summary: string,
  date: Date,
): Promise<string> {
  if (existingEventId) {
    await updateCalendarEvent(accessToken, existingEventId, summary, date)
    return existingEventId
  }
  return createCalendarEvent(accessToken, summary, date)
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const offerId = Number.parseInt(id, 10)
  if (!Number.isFinite(offerId) || offerId <= 0) {
    return adminJsonError("Invalid offer id", 400)
  }

  // Check Google Calendar is connected
  if (!(await isGmailConnected())) {
    return NextResponse.json({ ok: false, reason: "calendar_not_connected" }, { status: 503 })
  }

  // Fetch the offer
  const [offer] = await db
    .select()
    .from(buyerOffers)
    .where(eq(buyerOffers.buyerOfferId, offerId))
    .limit(1)

  if (!offer) return adminJsonError("Offer not found", 404)

  // Resolve property + entity via property_entity_id
  const [peRow] = await db
    .select({
      contractDate: pandaProperties.contractDate,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      entityName: entities.entityName,
    })
    .from(propertyEntities)
    .innerJoin(
      pandaProperties,
      eq(propertyEntities.propertyListId, pandaProperties.propertyListId),
    )
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(eq(propertyEntities.propertyEntityId, offer.propertyEntityId))
    .limit(1)

  const propertyLabel = peRow
    ? [peRow.streetAddress, peRow.suburb].filter(Boolean).join(", ")
    : ""
  const buyerName = peRow?.entityName ?? "Buyer"
  const suffix = propertyLabel ? ` – ${buyerName} @ ${propertyLabel}` : ` – ${buyerName}`

  const contractDate = peRow?.contractDate ? new Date(peRow.contractDate) : null

  const accessToken = await getCalendarAccessToken()

  const updates: Partial<typeof buyerOffers.$inferInsert> = {}
  let syncedCount = 0

  // Settlement (days from contract — same milestone as former settlement_date)
  if (
    contractDate &&
    offer.subjectToSaleDays != null &&
    offer.subjectToSaleDays > 0
  ) {
    const date = addDays(contractDate, offer.subjectToSaleDays)
    const summary = `Settlement${suffix}`
    updates.settlementCalendarEventId = await syncEvent(
      accessToken,
      offer.settlementCalendarEventId,
      summary,
      date,
    )
    syncedCount++
  } else if (offer.settlementCalendarEventId) {
    await deleteCalendarEvent(accessToken, offer.settlementCalendarEventId)
    updates.settlementCalendarEventId = null
  }

  // Condition deadlines — only if contractDate is available
  if (contractDate) {
    // Cooling off
    if (offer.coolingOffDays != null && offer.coolingOffDays > 0) {
      const date = addDays(contractDate, offer.coolingOffDays)
      const summary = `Cooling Off${suffix}`
      updates.coolingOffCalendarEventId = await syncEvent(
        accessToken,
        offer.coolingOffCalendarEventId,
        summary,
        date,
      )
      syncedCount++
    } else if (offer.coolingOffCalendarEventId) {
      await deleteCalendarEvent(accessToken, offer.coolingOffCalendarEventId)
      updates.coolingOffCalendarEventId = null
    }

    // Finance (omit cash offers — matches in-app condition calendar)
    if (!offer.isCashOffer && offer.financeDays != null && offer.financeDays > 0) {
      const date = addDays(contractDate, offer.financeDays)
      const summary = `Finance${suffix}`
      updates.financeCalendarEventId = await syncEvent(
        accessToken,
        offer.financeCalendarEventId,
        summary,
        date,
      )
      syncedCount++
    } else if (offer.financeCalendarEventId) {
      await deleteCalendarEvent(accessToken, offer.financeCalendarEventId)
      updates.financeCalendarEventId = null
    }
  }

  // Building & Pest — not synced to Google (matches in-app `computeConditionEventsForCalendar`).
  // Due diligence has never had a stored Google event id on `buyer_offers`.
  if (offer.buildingPestCalendarEventId) {
    await deleteCalendarEvent(accessToken, offer.buildingPestCalendarEventId)
    updates.buildingPestCalendarEventId = null
  }

  // Persist updated event IDs
  if (Object.keys(updates).length > 0) {
    await db
      .update(buyerOffers)
      .set(updates)
      .where(eq(buyerOffers.buyerOfferId, offerId))
  }

  return NextResponse.json({ ok: true, syncedCount })
}
