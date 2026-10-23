import { and, desc, eq, isNotNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import {
  buyerOffers,
  entities,
  entityMembers,
  offerFormSubmissions,
  offerFormTokens,
  pandaProperties,
  propertyEntities,
} from "@/db/schema"
import { fetchSellerSolicitorContact } from "@/lib/admin/seller-solicitor.server"

export async function handleOfferFormGet(
  token: string,
  { offerId, viewMode = false }: { offerId?: number; viewMode?: boolean } = {},
): Promise<NextResponse> {
  try {
    const [tokenRow] = await db
      .select()
      .from(offerFormTokens)
      .where(eq(offerFormTokens.token, token))
      .limit(1)

    if (!tokenRow) {
      return NextResponse.json({ error: "Form not found or no longer available" }, { status: 404 })
    }

    const { propertyEntityId, propertyListId } = tokenRow

    // When a specific offer is requested, validate it belongs to this token's entity.
    let specificOffer: (typeof buyerOffers.$inferSelect) | null = null
    if (offerId != null) {
      const [row] = await db
        .select()
        .from(buyerOffers)
        .where(and(eq(buyerOffers.buyerOfferId, offerId), eq(buyerOffers.propertyEntityId, propertyEntityId)))
        .limit(1)
      if (!row) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 })
      }
      specificOffer = row
    }

    const [pe] = await db
      .select({ entityId: propertyEntities.entityId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)

    const [entityRow, property, buyerMembers, repMember, latestSubmission, latestOffer, sellerSolicitorRow] = await Promise.all([
      pe
        ? db.select({
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

      db.select({
          streetAddress: pandaProperties.streetAddress,
          suburb: pandaProperties.suburb,
          state: pandaProperties.state,
          postcode: pandaProperties.postcode,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, propertyListId))
        .limit(1)
        .then((r) => r[0] ?? null),

      pe
        ? db.select({
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
        ? db.select({
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

      db.select()
        .from(offerFormSubmissions)
        .where(
          viewMode
            ? and(eq(offerFormSubmissions.offerFormTokenId, tokenRow.offerFormTokenId), isNotNull(offerFormSubmissions.submittedAt))
            : eq(offerFormSubmissions.offerFormTokenId, tokenRow.offerFormTokenId),
        )
        .orderBy(desc(offerFormSubmissions.createdAt))
        .limit(1)
        .then((r) => r[0] ?? null),

      specificOffer
        ? Promise.resolve(specificOffer)
        : db.select()
          .from(buyerOffers)
          .where(eq(buyerOffers.propertyEntityId, propertyEntityId))
          .orderBy(desc(buyerOffers.buyerOfferId))
          .limit(1)
          .then((r) => r[0] ?? null),

      fetchSellerSolicitorContact(propertyListId),
    ])

    const offerForPrefill = latestOffer

    const propertyAddress = property
      ? [property.streetAddress, property.suburb, property.state, property.postcode]
          .filter(Boolean)
          .join(", ")
      : null

    let buyers: Array<{ name: string; phone: string; email: string; address: string }>
    if (buyerMembers.length > 0) {
      buyers = buyerMembers.map((m, i) => ({
        name: m.memberName ?? "",
        // First buyer falls back to entity-level contact when member fields are empty
        phone: m.memberPhoneNumber?.trim() || (i === 0 ? (entityRow?.contact?.trim() ?? "") : ""),
        email: m.memberEmailAddress?.trim() || (i === 0 ? (entityRow?.emailAddress?.trim() ?? "") : ""),
        address: m.memberAddress ?? "",
      }))
    } else if (entityRow) {
      buyers = [{
        name: entityRow.entityName ?? "",
        phone: entityRow.contact?.trim() ?? "",
        email: entityRow.emailAddress ?? "",
        address: [entityRow.address, entityRow.esuburb, entityRow.epostcode].filter(Boolean).join(", "),
      }]
    } else {
      buyers = [{ name: "", phone: "", email: "", address: "" }]
    }

    // If a *final* submission has buyersJson, prefer it (buyer's own input takes precedence).
    // Draft submissions are excluded: a draft may have been auto-saved before entity member
    // data was added or updated, so using draft buyersJson would hide the latest entity member data.
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
      offerAmount: latestSubmission?.offerAmount ?? (offerForPrefill?.offer ?? undefined),
      depositInitial: latestSubmission?.initialPayment ?? (offerForPrefill?.depositInitial ?? undefined),
      depositBalance: latestSubmission?.secondPayment ?? (offerForPrefill?.depositBalance ?? undefined),
      isCashOffer: latestSubmission?.isCashBuyer ?? offerForPrefill?.isCashOffer ?? undefined,
      waiveCoolingOff: offerForPrefill?.waiveCoolingOff ?? undefined,
      isSubjectToFinance: offerForPrefill?.isSubjectToFinance ?? latestSubmission?.isSubjectToFinance ?? undefined,
      financePreApproved: offerForPrefill?.financePreApproved ?? latestSubmission?.financePreApproved ?? undefined,
      financeApprovalDays: offerForPrefill?.financeDays != null ? String(offerForPrefill.financeDays) : undefined,
      financeBank: offerForPrefill?.financeBank ?? latestSubmission?.financeBank ?? undefined,
      financeBankContactName: offerForPrefill?.financeBankContactName ?? latestSubmission?.financeBankContactName ?? undefined,
      financeBankContactPhone: offerForPrefill?.financeBankContactPhone ?? latestSubmission?.financeBankContactPhone ?? undefined,
      financeBankContactEmail: offerForPrefill?.financeBankContactEmail ?? latestSubmission?.financeBankContactEmail ?? undefined,
      buildingPestDays: offerForPrefill?.buildingPestDays ?? undefined,
      suggestBuildingCompanies: offerForPrefill?.suggestBuildingCompanies ?? latestSubmission?.suggestBuildingCompanies ?? undefined,
      isSubjectToSale: offerForPrefill?.isSubjectToSale ?? latestSubmission?.isSubjectToSale ?? undefined,
      subjectToSaleAddress: offerForPrefill?.subjectToSaleAddress ?? latestSubmission?.salePropertyAddress ?? undefined,
      subjectToSaleStage: offerForPrefill?.subjectToSaleStage ?? latestSubmission?.salePropertyStatus ?? undefined,
      saleDaysBeforeListing: offerForPrefill?.saleDaysBeforeListingLive != null ? String(offerForPrefill.saleDaysBeforeListingLive) : undefined,
      saleDaysToContract: offerForPrefill?.saleOfPropertyDays != null ? String(offerForPrefill.saleOfPropertyDays) : undefined,
      saleDaysToUnconditional: offerForPrefill?.unconditionalContractDays != null ? String(offerForPrefill.unconditionalContractDays) : undefined,
      saleDaysToSettle: offerForPrefill?.subjectToSaleDays != null ? String(offerForPrefill.subjectToSaleDays) : undefined,
      saleIsUnconditional: offerForPrefill?.saleIsUnconditional ?? undefined,
      saleUnconditionalDate: offerForPrefill?.saleUnconditionalDate ?? undefined,
      saleBuyerSettlementDate: offerForPrefill?.saleBuyerSettlementDate ?? undefined,
      saleActiveConditions: offerForPrefill?.saleActiveConditions ?? undefined,
      saleConditionsElaboration: offerForPrefill?.otherConditions ?? latestSubmission?.saleConditionsElaboration ?? undefined,
      saleFreeAppraisal: offerForPrefill?.saleFreeAppraisal ?? undefined,
      settlementPeriod: offerForPrefill?.settlementPeriod ?? latestSubmission?.settlementPeriod ?? undefined,
      settlementDate: offerForPrefill?.settlementDate ?? undefined,
      conditionNotes: offerForPrefill?.conditionNotes ?? undefined,
      // signatures intentionally omitted — DB entries lack buyerId; client regenerates slots from buyer state
      viewMode,
    }

    return NextResponse.json(prefill, { headers: { "Cache-Control": "no-store" } })
  } catch (cause) {
    console.error(`[GET /api/offer-form/${token}]`, cause)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
