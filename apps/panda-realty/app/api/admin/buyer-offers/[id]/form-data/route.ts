import { and, desc, eq, isNotNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { buyerOffers, offerFormSubmissions, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { getOrCreateOfferFormToken } from "@/lib/offer-form-token.server"
import { syncPropertySettlementFromAcceptedOffer } from "@/lib/admin/sync-property-settlement"
import { syncPropertyNextConditionDueForPropertyEntity } from "@/lib/admin/sync-property-next-condition-due"
import type { SubmitData } from "@/app/api/offer-form/[token]/offer-form-upsert"
import {
  upsertEntityMembersInTx,
  upsertSolicitorInTx,
} from "@/app/api/offer-form/[token]/offer-form-upsert"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const buyerOfferId = Number.parseInt(id, 10)
  if (!Number.isFinite(buyerOfferId) || buyerOfferId <= 0) {
    return adminJsonError("Invalid id", 400)
  }

  const [offerRow] = await db
    .select({ propertyEntityId: buyerOffers.propertyEntityId })
    .from(buyerOffers)
    .where(eq(buyerOffers.buyerOfferId, buyerOfferId))
    .limit(1)

  if (!offerRow) return adminJsonError("Not found", 404)

  const [pe] = await db
    .select({ entityId: propertyEntities.entityId, propertyListId: propertyEntities.propertyListId })
    .from(propertyEntities)
    .where(eq(propertyEntities.propertyEntityId, offerRow.propertyEntityId))
    .limit(1)

  if (!pe) return adminJsonError("Not found", 404)

  // Needed for 1B: create a minimal offerFormSubmissions row if none exists yet.
  const offerFormToken = pe.propertyListId != null
    ? await getOrCreateOfferFormToken(offerRow.propertyEntityId, pe.propertyListId)
    : null

  const data = (await request.json()) as SubmitData
  const offerAmountStr = (data.offerAmount ?? "").replace(/[^0-9.]/g, "") || "0"
  const isCashOffer =
    data.cashBuyer === "Yes" ? true : data.cashBuyer === "No" ? false : undefined

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(buyerOffers)
        .set({
          offer: offerAmountStr,
          isCashOffer,
          depositInitial: data.initialPayment
            ? data.initialPayment.replace(/[^0-9.]/g, "") || null
            : undefined,
          depositBalance: data.secondPayment
            ? data.secondPayment.replace(/[^0-9.]/g, "") || null
            : undefined,
          waiveCoolingOff: data.waiveCoolingOff,
          isSubjectToFinance: data.subjectToFinance,
          financePreApproved: data.financePreApproved,
          financeDays: data.financeApprovalDays
            ? parseInt(data.financeApprovalDays, 10) || null
            : undefined,
          financeBank: data.financeBank ?? null,
          financeBankContactName: data.financeBankContactName ?? null,
          financeBankContactPhone: data.financeBankContactPhone ?? null,
          financeBankContactEmail: data.financeBankContactEmail ?? null,
          buildingPestDays:
            data.buildingPestInspection === "7_days"
              ? 7
              : data.buildingPestInspection === "14_days"
                ? 14
                : data.buildingPestInspection === "no"
                  ? 0
                  : undefined,
          suggestBuildingCompanies: data.suggestBuildingCompanies,
          isSubjectToSale: data.subjectToSale,
          subjectToSaleAddress: data.salePropertyAddress ?? null,
          subjectToSaleStage: data.saleStatus ?? null,
          saleDaysBeforeListingLive: data.saleDaysBeforeListing
            ? parseInt(data.saleDaysBeforeListing, 10) || null
            : undefined,
          saleOfPropertyDays: data.saleDaysToContract
            ? parseInt(data.saleDaysToContract, 10) || null
            : undefined,
          unconditionalContractDays: data.saleDaysToUnconditional
            ? parseInt(data.saleDaysToUnconditional, 10) || null
            : undefined,
          subjectToSaleDays: data.saleDaysToSettle
            ? parseInt(data.saleDaysToSettle, 10) || null
            : undefined,
          saleIsUnconditional: data.saleIsUnconditional,
          saleUnconditionalDate: data.saleUnconditionalDate ?? null,
          saleBuyerSettlementDate: data.saleBuyerSettlementDate ?? null,
          saleActiveConditions: data.saleActiveConditions ?? null,
          otherConditions: data.saleConditionsElaboration ?? null,
          saleFreeAppraisal: data.saleFreeAppraisal,
          settlementPeriod: data.settlementPeriod ?? null,
          settlementDate: data.settlementDate ?? null,
          conditionNotes: data.extraComments ?? null,
          updatedAt: new Date(),
        })
        .where(eq(buyerOffers.buyerOfferId, buyerOfferId))

      // If this offer is the accepted one, keep the property's settlement date mirrored to the
      // edited offer value (no-op when the offer isn't accepted).
      await syncPropertySettlementFromAcceptedOffer(tx, offerRow.propertyEntityId)
      // Condition days / settlement may have changed → recompute the materialised next-condition-due.
      await syncPropertyNextConditionDueForPropertyEntity(tx, offerRow.propertyEntityId)

      await upsertEntityMembersInTx(tx, pe.entityId, data)
      await upsertSolicitorInTx(tx, data)

      // Single lookup for the submitted row used by both the solicitor and multi-offer patches.
      const [submittedRow] = await tx
        .select({ offerFormSubmissionId: offerFormSubmissions.offerFormSubmissionId })
        .from(offerFormSubmissions)
        .where(and(
          eq(offerFormSubmissions.propertyEntityId, offerRow.propertyEntityId),
          isNotNull(offerFormSubmissions.submittedAt),
        ))
        .orderBy(desc(offerFormSubmissions.offerFormSubmissionId))
        .limit(1)

      // Persist multi-offer acknowledgment checkboxes (columns live on offerFormSubmissions, not buyerOffers).
      if (submittedRow && (
        data.multiOfferCheckHighest !== undefined ||
        data.multiOfferCheckDiscretion !== undefined ||
        data.multiOfferCheckConfidential !== undefined
      )) {
        await tx
          .update(offerFormSubmissions)
          .set({
            ...(data.multiOfferCheckHighest !== undefined && { multiOfferCheckHighest: data.multiOfferCheckHighest }),
            ...(data.multiOfferCheckDiscretion !== undefined && { multiOfferCheckDiscretion: data.multiOfferCheckDiscretion }),
            ...(data.multiOfferCheckConfidential !== undefined && { multiOfferCheckConfidential: data.multiOfferCheckConfidential }),
          })
          .where(eq(offerFormSubmissions.offerFormSubmissionId, submittedRow.offerFormSubmissionId))
      }

      // Persist solicitor fields to offerFormSubmissions so the submission panel shows them.
      const solicitorPatch = {
        solicitorName: data.solicitorName ?? null,
        solicitorPhone: data.solicitorPhone ?? null,
        solicitorAddress: data.solicitorAddress ?? null,
        solicitorEmail: data.solicitorEmail || null,
      }
      if (submittedRow) {
        await tx
          .update(offerFormSubmissions)
          .set(solicitorPatch)
          .where(eq(offerFormSubmissions.offerFormSubmissionId, submittedRow.offerFormSubmissionId))
      } else if (
        offerFormToken &&
        pe.propertyListId != null &&
        (solicitorPatch.solicitorName || solicitorPatch.solicitorPhone || solicitorPatch.solicitorEmail)
      ) {
        // 1B: no submission exists yet — create a minimal row so the data is visible in the panel.
        // submittedAt is set so offer-form-status (which requires isNotNull(submittedAt)) can find it.
        await tx.insert(offerFormSubmissions).values({
          offerFormTokenId: offerFormToken.offerFormTokenId,
          propertyEntityId: offerRow.propertyEntityId,
          propertyListId: pe.propertyListId,
          ...solicitorPatch,
          submittedAt: new Date(),
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error(`[PATCH /api/admin/buyer-offers/${buyerOfferId}/form-data]`, cause)
    return adminJsonError("Failed to update offer", 500)
  }
}
