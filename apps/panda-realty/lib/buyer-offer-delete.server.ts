import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers } from "@/db/schema"
import { deleteBuyerOfferGoogleCalendarEventsBestEffort } from "@/lib/buyer-offer-google-calendar-events.server"
import { getCalendarAccessToken } from "@/lib/google-calendar-client"
import { isGmailConnected } from "@/lib/gmail-client"

async function getAccessTokenIfConnected(): Promise<string | null> {
  if (!(await isGmailConnected())) return null
  return getCalendarAccessToken()
}

/**
 * Deletes a buyer offer row and best-effort removes linked Google Calendar events.
 * Returns false when no row was found.
 */
export async function deleteBuyerOfferById(buyerOfferId: number): Promise<boolean> {
  const [offer] = await db
    .select()
    .from(buyerOffers)
    .where(eq(buyerOffers.buyerOfferId, buyerOfferId))
    .limit(1)

  if (!offer) return false

  const accessToken = await getAccessTokenIfConnected()
  if (accessToken) {
    await deleteBuyerOfferGoogleCalendarEventsBestEffort(
      accessToken,
      offer,
      "[deleteBuyerOfferById]",
      buyerOfferId,
    )
  }

  await db.delete(buyerOffers).where(eq(buyerOffers.buyerOfferId, buyerOfferId))
  return true
}
