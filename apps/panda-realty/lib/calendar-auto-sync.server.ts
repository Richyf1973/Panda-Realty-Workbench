import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, entities, entityMembers, pandaProperties, propertyEntities } from "@/db/schema"
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarAccessToken,
  updateCalendarEvent,
} from "@/lib/google-calendar-client"
import { isGmailConnected } from "@/lib/gmail-client"

async function getAccessTokenIfConnected(): Promise<string | null> {
  if (!(await isGmailConnected())) return null
  return getCalendarAccessToken()
}

function addDays(base: Date, days: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days))
}

async function syncAllDayEvent(
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

// ─── Buyer offer ──────────────────────────────────────────────────────────────

export async function autoSyncBuyerOfferCalendar(offerId: number): Promise<void> {
  const accessToken = await getAccessTokenIfConnected()
  if (!accessToken) return

  const [offer] = await db
    .select()
    .from(buyerOffers)
    .where(eq(buyerOffers.buyerOfferId, offerId))
    .limit(1)
  if (!offer) return

  const [peRow] = await db
    .select({
      contractDate: pandaProperties.contractDate,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      entityName: entities.entityName,
    })
    .from(propertyEntities)
    .innerJoin(pandaProperties, eq(propertyEntities.propertyListId, pandaProperties.propertyListId))
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(eq(propertyEntities.propertyEntityId, offer.propertyEntityId))
    .limit(1)

  const propertyLabel = peRow
    ? [peRow.streetAddress, peRow.suburb].filter(Boolean).join(", ")
    : ""
  const buyerName = peRow?.entityName ?? "Buyer"
  const suffix = propertyLabel ? ` – ${buyerName} @ ${propertyLabel}` : ` – ${buyerName}`
  const contractDate = peRow?.contractDate ? new Date(peRow.contractDate) : null

  const updates: Partial<typeof buyerOffers.$inferInsert> = {}

  if (contractDate && offer.subjectToSaleDays != null && offer.subjectToSaleDays > 0) {
    updates.settlementCalendarEventId = await syncAllDayEvent(
      accessToken,
      offer.settlementCalendarEventId,
      `Completion Date${suffix}`,
      addDays(contractDate, offer.subjectToSaleDays),
    )
  } else if (offer.settlementCalendarEventId) {
    await deleteCalendarEvent(accessToken, offer.settlementCalendarEventId)
    updates.settlementCalendarEventId = null
  }

  if (contractDate) {
    if (offer.coolingOffDays != null && offer.coolingOffDays > 0) {
      updates.coolingOffCalendarEventId = await syncAllDayEvent(
        accessToken,
        offer.coolingOffCalendarEventId,
        `Cooling Off${suffix}`,
        addDays(contractDate, offer.coolingOffDays),
      )
    } else if (offer.coolingOffCalendarEventId) {
      await deleteCalendarEvent(accessToken, offer.coolingOffCalendarEventId)
      updates.coolingOffCalendarEventId = null
    }

    if (!offer.isCashOffer && offer.financeDays != null && offer.financeDays > 0) {
      updates.financeCalendarEventId = await syncAllDayEvent(
        accessToken,
        offer.financeCalendarEventId,
        `Finance${suffix}`,
        addDays(contractDate, offer.financeDays),
      )
    } else if (offer.financeCalendarEventId) {
      await deleteCalendarEvent(accessToken, offer.financeCalendarEventId)
      updates.financeCalendarEventId = null
    }
  }

  if (offer.buildingPestCalendarEventId) {
    await deleteCalendarEvent(accessToken, offer.buildingPestCalendarEventId)
    updates.buildingPestCalendarEventId = null
  }

  if (Object.keys(updates).length > 0) {
    await db.update(buyerOffers).set(updates).where(eq(buyerOffers.buyerOfferId, offerId))
  }
}

// ─── Entity member (viewing) ──────────────────────────────────────────────────

export async function autoSyncEntityMemberCalendar(memberId: number): Promise<void> {
  const accessToken = await getAccessTokenIfConnected()
  if (!accessToken) return

  const [member] = await db
    .select()
    .from(entityMembers)
    .where(eq(entityMembers.entityMemberId, memberId))
    .limit(1)
  if (!member) return

  let propertyLabel = ""
  try {
    const [pe] = await db
      .select({ propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.entityId, member.entityId))
      .limit(1)

    if (pe?.propertyListId) {
      const [prop] = await db
        .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, pe.propertyListId))
        .limit(1)
      if (prop) {
        propertyLabel = [prop.streetAddress, prop.suburb].filter(Boolean).join(", ")
      }
    }
  } catch {
    // best-effort — proceed without address
  }

  const summary = propertyLabel
    ? `Property Viewing – ${member.memberName} @ ${propertyLabel}`
    : `Property Viewing – ${member.memberName}`

  if (member.scheduledViewingDate) {
    const date = new Date(member.scheduledViewingDate)
    let eventId = member.googleCalendarEventId

    if (eventId) {
      await updateCalendarEvent(accessToken, eventId, summary, date)
    } else {
      eventId = await createCalendarEvent(accessToken, summary, date)
      await db
        .update(entityMembers)
        .set({ googleCalendarEventId: eventId })
        .where(eq(entityMembers.entityMemberId, memberId))
    }
  } else if (member.googleCalendarEventId) {
    await deleteCalendarEvent(accessToken, member.googleCalendarEventId)
    await db
      .update(entityMembers)
      .set({ googleCalendarEventId: null })
      .where(eq(entityMembers.entityMemberId, memberId))
  }
}
