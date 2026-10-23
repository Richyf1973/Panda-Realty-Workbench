import "server-only"

import { buyerOffers } from "@/db/schema"
import { deleteCalendarEvent } from "@/lib/google-calendar-client"

type BuyerOfferCalendarIds = Pick<
  typeof buyerOffers.$inferSelect,
  | "settlementCalendarEventId"
  | "coolingOffCalendarEventId"
  | "financeCalendarEventId"
  | "buildingPestCalendarEventId"
>

/** Stored Google Calendar event ids on a buyer offer row (Building & Pest uses the legacy column). */
export function buyerOfferStoredGoogleCalendarEventIds(
  offer: BuyerOfferCalendarIds,
): string[] {
  return [
    offer.settlementCalendarEventId,
    offer.coolingOffCalendarEventId,
    offer.financeCalendarEventId,
    offer.buildingPestCalendarEventId,
  ].filter((x): x is string => typeof x === "string" && x.trim() !== "")
}

/**
 * Best-effort: delete each event; logs and continues on per-event failure.
 */
export async function deleteBuyerOfferGoogleCalendarEventsBestEffort(
  accessToken: string,
  offer: BuyerOfferCalendarIds,
  logPrefix: string,
  buyerOfferIdForLog: number,
): Promise<void> {
  for (const eventId of buyerOfferStoredGoogleCalendarEventIds(offer)) {
    try {
      await deleteCalendarEvent(accessToken, eventId)
    } catch (e) {
      console.error(`${logPrefix} calendar delete`, buyerOfferIdForLog, eventId, e)
    }
  }
}
