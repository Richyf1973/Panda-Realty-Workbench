import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, entities, entityMembers } from "@/db/schema"
import { CONTACT_CATEGORY_SOLICITOR, ENTITY_CATEGORY_CONTACT } from "@/lib/admin/entity-category-ids"
import { maybeAdvanceBuyerPipelineOnOfferInTx } from "@/lib/admin/buyer-offers-workspace-sync.server"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export interface BuyerSubmit {
  name: string
  phone?: string
  email?: string
  address?: string
  hasRep?: boolean
  repName?: string
  repPhone?: string
  repEmail?: string
  repIsPreferredContact?: string
}

export interface SignatureSubmit {
  buyerName: string
  data: string
  method: string
  signDate: string
}

export interface SubmitData {
  buyers: BuyerSubmit[]
  buyer1Name: string
  buyer2Name?: string
  offerAmount: string
  totalDeposit?: string
  initialPayment?: string
  secondPayment?: string
  cashBuyer?: "Yes" | "No"
  buildingPestInspection?: string
  waiveCoolingOff?: boolean
  settlementPeriod?: string
  settlementDate?: string
  subjectToSale?: boolean
  salePropertyAddress?: string
  saleStatus?: string
  saleDaysBeforeListing?: string
  saleDaysToContract?: string
  saleDaysToUnconditional?: string
  saleDaysToSettle?: string
  saleIsUnconditional?: boolean
  saleUnconditionalDate?: string
  saleBuyerSettlementDate?: string
  saleActiveConditions?: string[]
  saleConditionsElaboration?: string
  saleFreeAppraisal?: boolean
  subjectToFinance?: boolean
  financePreApproved?: boolean
  financeApprovalDays?: string
  financeBank?: string
  suggestBuildingCompanies?: boolean
  financeBankContactName?: string
  financeBankContactPhone?: string
  financeBankContactEmail?: string
  solicitorName?: string
  solicitorPhone?: string
  solicitorAddress?: string
  solicitorEmail?: string
  extraComments?: string
  signatures?: SignatureSubmit[]
  multiOfferCheckHighest?: boolean
  multiOfferCheckDiscretion?: boolean
  multiOfferCheckConfidential?: boolean
}

export async function upsertBuyerOfferInTx(tx: Tx, propertyEntityId: number, data: SubmitData) {
  const offerAmountStr = data.offerAmount.replace(/[^0-9.]/g, "") || "0"
  const isCashOffer = data.cashBuyer === "Yes" ? true : data.cashBuyer === "No" ? false : undefined

  const fields = {
    offer: offerAmountStr,
    isCashOffer,
    depositInitial: data.initialPayment ? data.initialPayment.replace(/[^0-9.]/g, "") || null : undefined,
    depositBalance: data.secondPayment ? data.secondPayment.replace(/[^0-9.]/g, "") || null : undefined,
    waiveCoolingOff: data.waiveCoolingOff,
    isSubjectToFinance: data.subjectToFinance,
    financePreApproved: data.financePreApproved,
    financeDays: data.financeApprovalDays ? parseInt(data.financeApprovalDays, 10) || null : undefined,
    financeBank: data.financeBank ?? null,
    financeBankContactName: data.financeBankContactName ?? null,
    financeBankContactPhone: data.financeBankContactPhone ?? null,
    financeBankContactEmail: data.financeBankContactEmail ?? null,
    buildingPestDays: data.buildingPestInspection === "7_days" ? 7 : data.buildingPestInspection === "14_days" ? 14 : data.buildingPestInspection === "no" ? 0 : undefined,
    suggestBuildingCompanies: data.suggestBuildingCompanies,
    isSubjectToSale: data.subjectToSale,
    subjectToSaleAddress: data.salePropertyAddress ?? null,
    subjectToSaleStage: data.saleStatus ?? null,
    saleDaysBeforeListingLive: data.saleDaysBeforeListing ? parseInt(data.saleDaysBeforeListing, 10) || null : undefined,
    saleOfPropertyDays: data.saleDaysToContract ? parseInt(data.saleDaysToContract, 10) || null : undefined,
    unconditionalContractDays: data.saleDaysToUnconditional ? parseInt(data.saleDaysToUnconditional, 10) || null : undefined,
    subjectToSaleDays: data.saleDaysToSettle ? parseInt(data.saleDaysToSettle, 10) || null : undefined,
    saleIsUnconditional: data.saleIsUnconditional,
    saleUnconditionalDate: data.saleUnconditionalDate ?? null,
    saleBuyerSettlementDate: data.saleBuyerSettlementDate ?? null,
    saleActiveConditions: data.saleActiveConditions ?? null,
    otherConditions: data.saleConditionsElaboration ?? null,
    saleFreeAppraisal: data.saleFreeAppraisal,
    settlementPeriod: data.settlementPeriod ?? null,
    settlementDate: data.settlementDate ?? null,
    conditionNotes: data.extraComments ?? null,
    dateOffered: new Date().toISOString().split("T")[0],
    updatedAt: new Date(),
  } as const

  await tx.insert(buyerOffers).values({ propertyEntityId, ...fields })

  const offerNum = parseFloat(offerAmountStr)
  if (offerNum > 0) {
    await maybeAdvanceBuyerPipelineOnOfferInTx(tx, propertyEntityId, [{ offer: offerAmountStr }])
  }
}

export async function upsertEntityMembersInTx(tx: Tx, entityId: number, data: SubmitData) {
  const existingBuyers = await tx
    .select({ entityMemberId: entityMembers.entityMemberId })
    .from(entityMembers)
    .where(and(eq(entityMembers.entityId, entityId), eq(entityMembers.isBuyersRepresentative, false)))
    .orderBy(entityMembers.entityMemberId)

  for (let i = 0; i < data.buyers.length; i++) {
    const b = data.buyers[i]
    if (!b?.name?.trim()) continue
    const existing = existingBuyers[i]
    const patch = {
      memberName: b.name,
      memberPhoneNumber: b.phone ?? null,
      memberEmailAddress: b.email ?? null,
      memberAddress: b.address ?? null,
      updatedAt: new Date(),
    }
    if (existing) {
      await tx.update(entityMembers).set(patch).where(eq(entityMembers.entityMemberId, existing.entityMemberId))
    } else {
      await tx.insert(entityMembers).values({ entityId, ...patch, isBuyersRepresentative: false })
    }
  }

  const buyer1 = data.buyers[0]
  if (buyer1?.hasRep && buyer1.repName?.trim()) {
    const [existingRep] = await tx
      .select({ entityMemberId: entityMembers.entityMemberId })
      .from(entityMembers)
      .where(and(eq(entityMembers.entityId, entityId), eq(entityMembers.isBuyersRepresentative, true)))
      .limit(1)

    const repPatch = {
      memberName: buyer1.repName,
      memberPhoneNumber: buyer1.repPhone ?? null,
      memberEmailAddress: buyer1.repEmail ?? null,
      memberNotes: buyer1.repIsPreferredContact ?? null,
      updatedAt: new Date(),
    }
    if (existingRep) {
      await tx.update(entityMembers).set(repPatch).where(eq(entityMembers.entityMemberId, existingRep.entityMemberId))
    } else {
      await tx.insert(entityMembers).values({ entityId, ...repPatch, isBuyersRepresentative: true })
    }
  }
}

export async function upsertSolicitorInTx(tx: Tx, data: SubmitData) {
  const { solicitorEmail, solicitorName, solicitorPhone, solicitorAddress } = data
  if (!solicitorEmail?.trim() && !solicitorName?.trim()) return

  const patch = {
    entityName: solicitorName ?? "",
    contact: solicitorPhone ?? null,
    address: solicitorAddress ?? null,
    updatedAt: new Date(),
  }

  if (solicitorEmail?.trim()) {
    const [existing] = await tx
      .select({ entityId: entities.entityId })
      .from(entities)
      .where(and(eq(entities.emailAddress, solicitorEmail.trim()), eq(entities.contactCategoryId, CONTACT_CATEGORY_SOLICITOR)))
      .limit(1)
    if (existing) {
      await tx.update(entities).set({ ...patch, emailAddress: solicitorEmail }).where(eq(entities.entityId, existing.entityId))
    } else {
      await tx.insert(entities).values({
        entityName: solicitorName ?? solicitorEmail,
        emailAddress: solicitorEmail,
        contact: solicitorPhone ?? null,
        address: solicitorAddress ?? null,
        contactCategoryId: CONTACT_CATEGORY_SOLICITOR,
        entityCategoryId: ENTITY_CATEGORY_CONTACT,
      })
    }
  } else if (solicitorName?.trim()) {
    const [existing] = await tx
      .select({ entityId: entities.entityId })
      .from(entities)
      .where(and(eq(entities.entityName, solicitorName.trim()), eq(entities.contactCategoryId, CONTACT_CATEGORY_SOLICITOR)))
      .limit(1)
    if (existing) {
      await tx.update(entities).set(patch).where(eq(entities.entityId, existing.entityId))
    } else {
      await tx.insert(entities).values({
        entityName: solicitorName,
        contact: solicitorPhone ?? null,
        address: solicitorAddress ?? null,
        contactCategoryId: CONTACT_CATEGORY_SOLICITOR,
        entityCategoryId: ENTITY_CATEGORY_CONTACT,
      })
    }
  }
}
