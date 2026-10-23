import { and, eq, exists, ne, not } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { buyerOffers } from "@/db/schema"
import { deleteBuyerOfferById } from "@/lib/buyer-offer-delete.server"
import { getSessionUser } from "@/lib/auth/session"
import { syncPropertySettlementFromAcceptedOffer } from "@/lib/admin/sync-property-settlement"
import { syncPropertyNextConditionDueForPropertyEntity } from "@/lib/admin/sync-property-next-condition-due"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const buyerOfferId = Number.parseInt(id, 10)
  if (!Number.isFinite(buyerOfferId) || buyerOfferId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  // Single query: fetch target and check for a conflicting accepted sibling.
  const other = alias(buyerOffers, "other")
  const [target] = await db
    .select({
      propertyEntityId: buyerOffers.propertyEntityId,
      hasConflict: exists(
        db
          .select({ _: other.buyerOfferId })
          .from(other)
          .where(
            and(
              eq(other.propertyEntityId, buyerOffers.propertyEntityId),
              eq(other.isAccepted, true),
              ne(other.buyerOfferId, buyerOfferId),
            ),
          ),
      ),
    })
    .from(buyerOffers)
    .where(eq(buyerOffers.buyerOfferId, buyerOfferId))

  if (!target) return adminJsonError("Not found", 404)
  if (target.hasConflict) return adminJsonError("Another offer is already accepted", 409)

  try {
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(buyerOffers)
        .set({ isAccepted: true })
        .where(eq(buyerOffers.buyerOfferId, buyerOfferId))
        .returning()
      // Mirror the now-accepted offer's settlement date onto the property so the due-date
      // highlight, calendar, and exports track the real contract settlement. Same tx as the
      // accept so the two commit or roll back together.
      await syncPropertySettlementFromAcceptedOffer(tx, target.propertyEntityId)
      // Recompute the materialised next-condition-due so the property re-sorts on the list.
      await syncPropertyNextConditionDueForPropertyEntity(tx, target.propertyEntityId)
      return row
    })
    return NextResponse.json(updated)
  } catch (cause) {
    console.error("[PATCH /api/admin/buyer-offers/[id]]", cause)
    return adminJsonError("Failed to accept offer", 500)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const buyerOfferId = Number.parseInt(id, 10)
  if (!Number.isFinite(buyerOfferId) || buyerOfferId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  try {
    const ok = await deleteBuyerOfferById(buyerOfferId)
    if (!ok) return adminJsonError("Not found", 404)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error("[DELETE /api/admin/buyer-offers/[id]]", cause)
    return adminJsonError("Failed to delete offer", 500)
  }
}
