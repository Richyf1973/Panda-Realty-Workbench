import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/db"
import {
  entities,
  offerFormSubmissions,
  offerFormTokens,
  propertyEntities,
} from "@/db/schema"
import { generateAndUploadOfferFormPdf } from "@/lib/offer-form-pdf-on-submit"

import { handleOfferFormGet } from "./offer-form-get-handler"
import { sendAgentNotification } from "./offer-form-notification"
import {
  type SubmitData,
  upsertBuyerOfferInTx,
  upsertEntityMembersInTx,
  upsertSolicitorInTx,
} from "./offer-form-upsert"

type RouteContext = { params: Promise<{ token: string }> }

const buyerSchema = z.object({
  name: z.string(),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  hasRep: z.boolean().optional().default(false),
  repName: z.string().optional().default(""),
  repPhone: z.string().optional().default(""),
  repEmail: z.string().optional().default(""),
  repIsPreferredContact: z.string().optional().default("yes"),
})

const signatureSchema = z.object({
  buyerName: z.string(),
  data: z.string(),
  method: z.string(),
  signDate: z.string(),
})

const submitSchema = z.object({
  buyers: z.array(buyerSchema).min(1),
  buyer1Name: z.string().min(1, "Buyer 1 name is required"),
  buyer2Name: z.string().optional(),
  offerAmount: z.string().min(1, "Offer amount is required"),
  totalDeposit: z.string().optional(),
  initialPayment: z.string().optional(),
  secondPayment: z.string().optional(),
  cashBuyer: z.enum(["Yes", "No"]).optional(),
  buildingPestInspection: z.string().optional(),
  waiveCoolingOff: z.boolean().optional(),
  settlementPeriod: z.string().optional(),
  settlementDate: z.string().optional(),
  subjectToSale: z.boolean().optional(),
  salePropertyAddress: z.string().optional(),
  saleStatus: z.string().optional(),
  saleDaysBeforeListing: z.string().optional(),
  saleDaysToContract: z.string().optional(),
  saleDaysToUnconditional: z.string().optional(),
  saleDaysToSettle: z.string().optional(),
  saleIsUnconditional: z.boolean().optional(),
  saleUnconditionalDate: z.string().optional(),
  saleBuyerSettlementDate: z.string().optional(),
  saleActiveConditions: z.array(z.string()).optional(),
  saleConditionsElaboration: z.string().optional(),
  saleFreeAppraisal: z.boolean().optional(),
  subjectToFinance: z.boolean().optional(),
  financePreApproved: z.boolean().optional(),
  financeApprovalDays: z.string().optional(),
  financeBank: z.string().optional(),
  suggestBuildingCompanies: z.boolean().optional(),
  financeBankContactName: z.string().optional(),
  financeBankContactPhone: z.string().optional(),
  financeBankContactEmail: z.string().optional(),
  solicitorName: z.string().optional(),
  solicitorPhone: z.string().optional(),
  solicitorAddress: z.string().optional(),
  solicitorEmail: z.string().email("Invalid solicitor email").optional().or(z.literal("")),
  extraComments: z.string().optional(),
  signatures: z.array(signatureSchema).optional(),
  multiOfferCheckHighest: z.boolean().optional(),
  multiOfferCheckDiscretion: z.boolean().optional(),
  multiOfferCheckConfidential: z.boolean().optional(),
}) satisfies z.ZodType<SubmitData>

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params
  const url = new URL(request.url)
  const rawOfferId = url.searchParams.get("offerId")
  const offerId = rawOfferId ? parseInt(rawOfferId, 10) : undefined
  const viewMode = url.searchParams.get("view") === "1"
  return handleOfferFormGet(token, {
    offerId: offerId != null && !isNaN(offerId) ? offerId : undefined,
    viewMode,
  })
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params
  const url = new URL(request.url)
  const isDraft = url.searchParams.get("draft") === "true"

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 })
  }

  const data = parsed.data

  try {
    const [tokenRow] = await db
      .select()
      .from(offerFormTokens)
      .where(eq(offerFormTokens.token, token))
      .limit(1)

    if (!tokenRow) {
      return NextResponse.json({ error: "Form not found or no longer available" }, { status: 404 })
    }

    await db.transaction(async (tx) => {
      const [existingDraft] = await tx
        .select({ offerFormSubmissionId: offerFormSubmissions.offerFormSubmissionId })
        .from(offerFormSubmissions)
        .where(
          and(
            eq(offerFormSubmissions.offerFormTokenId, tokenRow.offerFormTokenId),
            isNull(offerFormSubmissions.submittedAt),
          ),
        )
        .limit(1)

      const submissionValues = {
        offerFormTokenId: tokenRow.offerFormTokenId,
        propertyEntityId: tokenRow.propertyEntityId,
        propertyListId: tokenRow.propertyListId,
        buyer1Name: data.buyer1Name,
        buyer2Name: data.buyer2Name ?? null,
        buyerAddress: data.buyers[0]?.address ?? null,
        buyerPhone: data.buyers[0]?.phone ?? null,
        buyerEmail: data.buyers[0]?.email || null,
        offerAmount: data.offerAmount,
        totalDeposit: data.totalDeposit ?? null,
        initialPayment: data.initialPayment ?? null,
        secondPayment: data.secondPayment ?? null,
        isCashBuyer: data.cashBuyer === "Yes" ? true : data.cashBuyer === "No" ? false : null,
        buildingPestInspection: data.buildingPestInspection ?? null,
        waiveCoolingOff: data.waiveCoolingOff ?? null,
        settlementPeriod: data.settlementPeriod ?? null,
        isSubjectToSale: data.subjectToSale ?? null,
        salePropertyAddress: data.salePropertyAddress ?? null,
        salePropertyStatus: data.saleStatus ?? null,
        saleDaysBeforeListingLive: data.saleDaysBeforeListing ? parseInt(data.saleDaysBeforeListing, 10) || null : null,
        saleDaysToGetSaleContract: data.saleDaysToContract ? parseInt(data.saleDaysToContract, 10) || null : null,
        saleDaysToGetUnconditionalContract: data.saleDaysToUnconditional ? parseInt(data.saleDaysToUnconditional, 10) || null : null,
        saleDaysToSettleExistingProperty: data.saleDaysToSettle ? parseInt(data.saleDaysToSettle, 10) || null : null,
        saleIsUnconditional: data.saleIsUnconditional ?? null,
        saleUnconditionalDate: data.saleUnconditionalDate ?? null,
        saleBuyerSettlementDate: data.saleBuyerSettlementDate ?? null,
        saleActiveConditions: data.saleActiveConditions ?? null,
        saleConditionsElaboration: data.saleConditionsElaboration ?? null,
        saleFreeAppraisal: data.saleFreeAppraisal ?? null,
        saleTimeframeDays: data.saleDaysToSettle ?? null,
        saleSettlementDate: data.saleBuyerSettlementDate ?? null,
        isSubjectToFinance: data.subjectToFinance ?? null,
        financePreApproved: data.financePreApproved ?? null,
        financeDaysToApprove: data.financeApprovalDays ?? null,
        financeBank: data.financeBank ?? null,
        suggestBuildingCompanies: data.suggestBuildingCompanies ?? null,
        financeBankContactName: data.financeBankContactName ?? null,
        financeBankContactPhone: data.financeBankContactPhone ?? null,
        financeBankContactEmail: data.financeBankContactEmail ?? null,
        solicitorName: data.solicitorName ?? null,
        solicitorPhone: data.solicitorPhone ?? null,
        solicitorAddress: data.solicitorAddress ?? null,
        solicitorEmail: data.solicitorEmail || null,
        extraComments: data.extraComments ?? null,
        buyersJson: data.buyers,
        signaturesJson: data.signatures ?? null,
        multiOfferCheckHighest: data.multiOfferCheckHighest ?? false,
        multiOfferCheckDiscretion: data.multiOfferCheckDiscretion ?? false,
        multiOfferCheckConfidential: data.multiOfferCheckConfidential ?? false,
        submittedAt: isDraft ? null : new Date(),
      }

      if (existingDraft) {
        await tx
          .update(offerFormSubmissions)
          .set(submissionValues)
          .where(eq(offerFormSubmissions.offerFormSubmissionId, existingDraft.offerFormSubmissionId))
      } else {
        await tx.insert(offerFormSubmissions).values(submissionValues)
      }

      const [pe] = await tx
        .select({ entityId: propertyEntities.entityId })
        .from(propertyEntities)
        .where(eq(propertyEntities.propertyEntityId, tokenRow.propertyEntityId))
        .limit(1)

      if (pe) {
        await tx
          .update(entities)
          .set({ entityName: data.buyer1Name, updatedAt: new Date() })
          .where(eq(entities.entityId, pe.entityId))

        await upsertEntityMembersInTx(tx, pe.entityId, data)
        await upsertSolicitorInTx(tx, data)
        if (!isDraft) {
          await upsertBuyerOfferInTx(tx, tokenRow.propertyEntityId, data)
        }
      }
    })

    if (isDraft) return NextResponse.json({ ok: true, draft: true }, { status: 200 })

    void generateAndUploadOfferFormPdf(tokenRow.propertyListId, data)
      .then((pdfLink) =>
        sendAgentNotification(tokenRow, data.buyer1Name, data.offerAmount, pdfLink ?? undefined),
      )
      .catch((e) => console.error("[offer-form POST] PDF/notification failed", e))

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (cause) {
    console.error(`[POST /api/offer-form/${token}]`, cause)
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 })
  }
}
