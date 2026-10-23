import "server-only"

import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { adminJsonError, isValidAdminEntityIdParam } from "@repo/admin/admin-api"

import { db } from "@/db"
import { buyerOffers, pandaProperties, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { getOrCreateOfferFormToken } from "@/lib/offer-form-token.server"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  if (!isValidAdminEntityIdParam("integer", id)) return adminJsonError("Invalid id", 400)

  const propertyEntityId = parseInt(id, 10)

  try {
    const linkRow = await db
      .select({
        propertyListId: propertyEntities.propertyListId,
        contractDate: pandaProperties.contractDate,
        propertyType: pandaProperties.propertyType,
      })
      .from(propertyEntities)
      .leftJoin(
        pandaProperties,
        eq(pandaProperties.propertyListId, propertyEntities.propertyListId),
      )
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!linkRow) return adminJsonError("Not found", 404)

    const offerFormToken = linkRow.propertyListId
      ? await getOrCreateOfferFormToken(propertyEntityId, linkRow.propertyListId).then((r) => r.token)
      : null

    const offers = await db
      .select({
        buyerOfferId: buyerOffers.buyerOfferId,
        offer: buyerOffers.offer,
        isAccepted: buyerOffers.isAccepted,
        dateOffered: buyerOffers.dateOffered,
        isCashOffer: buyerOffers.isCashOffer,
        noConditions: buyerOffers.noConditions,
        coolingOffDays: buyerOffers.coolingOffDays,
        financeDays: buyerOffers.financeDays,
        buildingPestDays: buyerOffers.buildingPestDays,
        dueDiligenceDays: buyerOffers.dueDiligenceDays,
        subjectToSaleDays: buyerOffers.subjectToSaleDays,
        subjectToSaleStage: buyerOffers.subjectToSaleStage,
        subjectToSaleAddress: buyerOffers.subjectToSaleAddress,
        saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
        unconditionalContractDays: buyerOffers.unconditionalContractDays,
        depositInitial: buyerOffers.depositInitial,
        depositBalance: buyerOffers.depositBalance,
        otherConditions: buyerOffers.otherConditions,
        customConditions: buyerOffers.customConditions,
        conditionNotes: buyerOffers.conditionNotes,
        settlementCalendarEventId: buyerOffers.settlementCalendarEventId,
        coolingOffCalendarEventId: buyerOffers.coolingOffCalendarEventId,
        financeCalendarEventId: buyerOffers.financeCalendarEventId,
        buildingPestCalendarEventId: buyerOffers.buildingPestCalendarEventId,
        waiveCoolingOff: buyerOffers.waiveCoolingOff,
        isSubjectToFinance: buyerOffers.isSubjectToFinance,
        financePreApproved: buyerOffers.financePreApproved,
        financeBank: buyerOffers.financeBank,
        financeBankContactName: buyerOffers.financeBankContactName,
        financeBankContactPhone: buyerOffers.financeBankContactPhone,
        financeBankContactEmail: buyerOffers.financeBankContactEmail,
        suggestBuildingCompanies: buyerOffers.suggestBuildingCompanies,
        isSubjectToSale: buyerOffers.isSubjectToSale,
        saleDaysBeforeListingLive: buyerOffers.saleDaysBeforeListingLive,
        saleIsUnconditional: buyerOffers.saleIsUnconditional,
        saleUnconditionalDate: buyerOffers.saleUnconditionalDate,
        saleBuyerSettlementDate: buyerOffers.saleBuyerSettlementDate,
        saleActiveConditions: buyerOffers.saleActiveConditions,
        saleFreeAppraisal: buyerOffers.saleFreeAppraisal,
        settlementPeriod: buyerOffers.settlementPeriod,
        settlementDate: buyerOffers.settlementDate,
      })
      .from(buyerOffers)
      .where(eq(buyerOffers.propertyEntityId, propertyEntityId))
      .orderBy(desc(buyerOffers.dateOffered), desc(buyerOffers.buyerOfferId))

    return NextResponse.json({
      propertyListId: linkRow.propertyListId,
      contractDate: linkRow.contractDate,
      propertyType: linkRow.propertyType ?? null,
      offerFormToken,
      offers,
    })
  } catch (cause) {
    console.error(`[GET /api/admin/property-entities/${propertyEntityId}/buyer-offers]`, cause)
    return adminJsonError("Failed to load buyer offers", 500)
  }
}
