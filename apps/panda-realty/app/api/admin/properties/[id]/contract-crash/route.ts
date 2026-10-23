import "server-only"

import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import {
  buyerOffers,
  pandaProperties,
  portalTokens,
  propertyEntities,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = Number.parseInt(id, 10)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  // Step 1: Validate — find the accepted offer for this property (fast fail before transaction)
  const [acceptedOffer] = await db
    .select({
      buyerOfferId: buyerOffers.buyerOfferId,
      propertyEntityId: buyerOffers.propertyEntityId,
    })
    .from(buyerOffers)
    .innerJoin(
      propertyEntities,
      eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId),
    )
    .where(
      and(
        eq(propertyEntities.propertyListId, propertyListId),
        eq(buyerOffers.isAccepted, true),
      ),
    )
    .limit(1)

  if (!acceptedOffer) {
    return adminJsonError(
      "No accepted offer found. Accept a buyer offer before triggering a contract crash.",
      409,
    )
  }

  try {
    const newToken = await db.transaction(async (tx) => {
      const { buyerOfferId, propertyEntityId } = acceptedOffer

      // Step 2: Un-accept the offer
      await tx
        .update(buyerOffers)
        .set({ isAccepted: false })
        .where(eq(buyerOffers.buyerOfferId, buyerOfferId))

      // Step 3: Reset deal pipeline stage
      await tx
        .update(pandaProperties)
        .set({ dealStageStatusId: null })
        .where(eq(pandaProperties.propertyListId, propertyListId))

      // Step 4: Revoke buyer portal token(s)
      await tx
        .update(portalTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(portalTokens.propertyEntityId, propertyEntityId),
            eq(portalTokens.role, "buyer"),
            isNull(portalTokens.revokedAt),
          ),
        )

      // Step 5: Reset sharedWithPortal on entity files for the crashed buyer
      await tx
        .update(propertyEntityFiles)
        .set({ sharedWithPortal: false })
        .where(eq(propertyEntityFiles.propertyEntityId, propertyEntityId))

      // Step 6: Reset sharedWithPortal on property list files
      await tx
        .update(propertyListFiles)
        .set({ sharedWithPortal: false })
        .where(eq(propertyListFiles.propertyListId, propertyListId))

      // Step 7: Revoke current seller token (if any)
      await tx
        .update(portalTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(portalTokens.propertyListId, propertyListId),
            eq(portalTokens.role, "seller"),
            isNull(portalTokens.revokedAt),
          ),
        )

      // Step 8: Create new seller token
      const [created] = await tx
        .insert(portalTokens)
        .values({ propertyListId, role: "seller", token: crypto.randomUUID() })
        .returning()

      return created
    })

    // Step 9: Return new seller token
    return NextResponse.json({ sellerToken: newToken })
  } catch (err) {
    console.error(`[POST /api/admin/properties/${propertyListId}/contract-crash]`, err)
    return adminJsonError("Internal server error", 500)
  }
}
