import { and, desc, eq, isNotNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import {
  buyerOffers,
  entities,
  entityMembers,
  offerFormSubmissions,
  pandaProperties,
  propertyEntities,
} from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { fetchSellerSolicitorContact } from "@/lib/admin/seller-solicitor.server"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const buyerOfferId = Number.parseInt(id, 10)
  if (!Number.isFinite(buyerOfferId) || buyerOfferId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  try {
    const [offerRow] = await db
      .select()
      .from(buyerOffers)
      .where(eq(buyerOffers.buyerOfferId, buyerOfferId))
      .limit(1)

    if (!offerRow) return adminJsonError("Not found", 404)

    const { propertyEntityId } = offerRow

    const [pe] = await db
      .select({ entityId: propertyEntities.entityId, propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)

    const [entityRow, property, buyerMembers, repMember, latestSubmission, sellerSolicitorRow] = await Promise.all([
      pe
        ? db
            .select({
              entityId: entities.entityId,
              entityName: entities.entityName,
              emailAddress: entities.emailAddress,
              contact: entities.contact,
              address: entities.address,
              esuburb: entities.esuburb,
              epostcode: entities.epostcode,
            })
            .from(entities)
            .where(eq(entities.entityId, pe.entityId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),

      pe?.propertyListId != null
        ? db
            .select({
              streetAddress: pandaProperties.streetAddress,
              suburb: pandaProperties.suburb,
              state: pandaProperties.state,
              postcode: pandaProperties.postcode,
            })
            .from(pandaProperties)
            .where(eq(pandaProperties.propertyListId, pe.propertyListId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),

      pe
        ? db
            .select({
              memberName: entityMembers.memberName,
              memberPhoneNumber: entityMembers.memberPhoneNumber,
              memberEmailAddress: entityMembers.memberEmailAddress,
              memberAddress: entityMembers.memberAddress,
            })
            .from(entityMembers)
            .where(
              and(
                eq(entityMembers.entityId, pe.entityId),
                eq(entityMembers.isBuyersRepresentative, false),
              ),
            )
            .orderBy(entityMembers.entityMemberId)
        : Promise.resolve([]),

      pe
        ? db
            .select({
              memberName: entityMembers.memberName,
              memberPhoneNumber: entityMembers.memberPhoneNumber,
              memberEmailAddress: entityMembers.memberEmailAddress,
              memberNotes: entityMembers.memberNotes,
            })
            .from(entityMembers)
            .where(
              and(
                eq(entityMembers.entityId, pe.entityId),
                eq(entityMembers.isBuyersRepresentative, true),
              ),
            )
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),

      // Query submissions by propertyEntityId (no token needed); admin view always reads submitted rows.
      db
        .select()
        .from(offerFormSubmissions)
        .where(and(
          eq(offerFormSubmissions.propertyEntityId, propertyEntityId),
          isNotNull(offerFormSubmissions.submittedAt),
        ))
        .orderBy(desc(offerFormSubmissions.createdAt))
        .limit(1)
        .then((r) => r[0] ?? null),

      pe?.propertyListId != null
        ? fetchSellerSolicitorContact(pe.propertyListId)
        : Promise.resolve(null),
    ])

    const propertyAddress = property
      ? [property.streetAddress, property.suburb, property.state, property.postcode]
          .filter(Boolean)
          .join(", ")
      : null

    let buyers: Array<{ name: string; phone: string; email: string; address: string }>
    if (buyerMembers.length > 0) {
      buyers = buyerMembers.map((m, i) => ({
        name: m.memberName ?? "",
        phone: m.memberPhoneNumber?.trim() || (i === 0 ? (entityRow?.contact?.trim() ?? "") : ""),
        email: m.memberEmailAddress?.trim() || (i === 0 ? (entityRow?.emailAddress?.trim() ?? "") : ""),
        address: m.memberAddress ?? "",
      }))
    } else if (entityRow) {
      buyers = [
        {
          name: entityRow.entityName ?? "",
          phone: entityRow.contact?.trim() ?? "",
          email: entityRow.emailAddress ?? "",
          address: [entityRow.address, entityRow.esuburb, entityRow.epostcode].filter(Boolean).join(", "),
        },
      ]
    } else {
      buyers = [{ name: "", phone: "", email: "", address: "" }]
    }

    const submissionBuyers = latestSubmission?.submittedAt != null ? latestSubmission.buyersJson : null
    if (submissionBuyers && submissionBuyers.length > 0) {
      buyers = submissionBuyers
    }

    const rep = repMember
      ? {
          name: repMember.memberName ?? "",
          phone: repMember.memberPhoneNumber ?? "",
          email: repMember.memberEmailAddress ?? "",
          isPreferredContact: repMember.memberNotes ?? "yes",
        }
      : null

    const prefill = {
      propertyAddress,
      buyers,
      rep,
      solicitorName: latestSubmission?.solicitorName ?? null,
      solicitorPhone: latestSubmission?.solicitorPhone ?? null,
      solicitorAddress: latestSubmission?.solicitorAddress ?? null,
      solicitorEmail: latestSubmission?.solicitorEmail ?? null,
      multiOfferCheckHighest: latestSubmission?.multiOfferCheckHighest ?? false,
      multiOfferCheckDiscretion: latestSubmission?.multiOfferCheckDiscretion ?? false,
      multiOfferCheckConfidential: latestSubmission?.multiOfferCheckConfidential ?? false,
      sellerSolicitorName: sellerSolicitorRow?.entityName ?? null,
      sellerSolicitorPhone: sellerSolicitorRow?.contact?.trim() || null,
      sellerSolicitorAddress: sellerSolicitorRow?.address ?? null,
      sellerSolicitorEmail: sellerSolicitorRow?.emailAddress ?? null,
      offerAmount: latestSubmission?.offerAmount ?? (offerRow.offer ?? undefined),
      depositInitial: latestSubmission?.initialPayment ?? (offerRow.depositInitial ?? undefined),
      depositBalance: latestSubmission?.secondPayment ?? (offerRow.depositBalance ?? undefined),
      isCashOffer: latestSubmission?.isCashBuyer ?? offerRow.isCashOffer ?? undefined,
      waiveCoolingOff: offerRow.waiveCoolingOff ?? undefined,
      isSubjectToFinance: offerRow.isSubjectToFinance ?? latestSubmission?.isSubjectToFinance ?? undefined,
      financePreApproved: offerRow.financePreApproved ?? latestSubmission?.financePreApproved ?? undefined,
      financeApprovalDays: offerRow.financeDays != null ? String(offerRow.financeDays) : undefined,
      financeBank: offerRow.financeBank ?? latestSubmission?.financeBank ?? undefined,
      financeBankContactName: offerRow.financeBankContactName ?? latestSubmission?.financeBankContactName ?? undefined,
      financeBankContactPhone: offerRow.financeBankContactPhone ?? latestSubmission?.financeBankContactPhone ?? undefined,
      financeBankContactEmail: offerRow.financeBankContactEmail ?? latestSubmission?.financeBankContactEmail ?? undefined,
      buildingPestDays: offerRow.buildingPestDays ?? undefined,
      suggestBuildingCompanies: offerRow.suggestBuildingCompanies ?? latestSubmission?.suggestBuildingCompanies ?? undefined,
      isSubjectToSale: offerRow.isSubjectToSale ?? latestSubmission?.isSubjectToSale ?? undefined,
      subjectToSaleAddress: offerRow.subjectToSaleAddress ?? latestSubmission?.salePropertyAddress ?? undefined,
      subjectToSaleStage: offerRow.subjectToSaleStage ?? latestSubmission?.salePropertyStatus ?? undefined,
      saleDaysBeforeListing: offerRow.saleDaysBeforeListingLive != null ? String(offerRow.saleDaysBeforeListingLive) : undefined,
      saleDaysToContract: offerRow.saleOfPropertyDays != null ? String(offerRow.saleOfPropertyDays) : undefined,
      saleDaysToUnconditional: offerRow.unconditionalContractDays != null ? String(offerRow.unconditionalContractDays) : undefined,
      saleDaysToSettle: offerRow.subjectToSaleDays != null ? String(offerRow.subjectToSaleDays) : undefined,
      saleIsUnconditional: offerRow.saleIsUnconditional ?? undefined,
      saleUnconditionalDate: offerRow.saleUnconditionalDate ?? undefined,
      saleBuyerSettlementDate: offerRow.saleBuyerSettlementDate ?? undefined,
      saleActiveConditions: offerRow.saleActiveConditions ?? undefined,
      saleConditionsElaboration: offerRow.otherConditions ?? latestSubmission?.saleConditionsElaboration ?? undefined,
      saleFreeAppraisal: offerRow.saleFreeAppraisal ?? undefined,
      settlementPeriod: offerRow.settlementPeriod ?? latestSubmission?.settlementPeriod ?? undefined,
      conditionNotes: offerRow.conditionNotes ?? undefined,
      viewMode: true,
    }

    return NextResponse.json(prefill, { headers: { "Cache-Control": "no-store" } })
  } catch (cause) {
    console.error(`[GET /api/admin/buyer-offers/${buyerOfferId}/form-view]`, cause)
    return adminJsonError("Server error", 500)
  }
}
