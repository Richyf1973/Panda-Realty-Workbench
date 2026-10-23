import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, entities, pandaProperties, propertyEntities } from "@/db/schema"
import { computeConditionDueDate } from "@/lib/admin/panda-property-completion-date"
import { computeDueHighlight, formatDueWarningLabel } from "@/lib/admin/due-highlight"
import type { DueWarningTier } from "@/lib/admin/due-highlight"
import { acceptedOfferDueDateSource, buildDueDateCandidates } from "@/lib/admin/property-due-date-candidates"

export type AcceptedOfferEnrichment = {
  contractPrice: string | null
  commissionAmount: string | null
  coolingOffDate: Date | null
  buildingPestDate: Date | null
  financeDate: Date | null
  dueDiligenceDate: Date | null
  saleOfPropertyDate: Date | null
  unconditionalContractDate: Date | null
  completionDate: Date | null
  isCashOffer: boolean | null
  noConditions: boolean | null
  isSubjectToSale: boolean | null
  otherConditions: string | null
  successfulBuyer: string | null
  successfulBuyerPropertyEntityId: number | null
  successfulBuyerEntityId: number | null
  successfulBuyerPhoneNumber: string | null
  successfulBuyerEmailAddress: string | null
}

export type PrimaryBuyerContactEnrichment = {
  phone: string | null
  email: string | null
  name: string | null
  emailName: string | null
}

export async function fetchAcceptedOffersByPropertyListId(
  propertyListIds: number[],
): Promise<Map<number, AcceptedOfferEnrichment>> {
  if (propertyListIds.length === 0) return new Map()
  const rows = await db
    .select({
      propertyListId: propertyEntities.propertyListId,
      propertyEntityId: propertyEntities.propertyEntityId,
      entityId: entities.entityId,
      offer: buyerOffers.offer,
      contractDate: pandaProperties.contractDate,
      commissionRate: pandaProperties.commissionRate,
      buyerOfferIsCashOffer: buyerOffers.isCashOffer,
      noConditions: buyerOffers.noConditions,
      coolingOffDays: buyerOffers.coolingOffDays,
      buildingPestDays: buyerOffers.buildingPestDays,
      financeDays: buyerOffers.financeDays,
      dueDiligenceDays: buyerOffers.dueDiligenceDays,
      saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
      unconditionalContractDays: buyerOffers.unconditionalContractDays,
      subjectToSaleDays: buyerOffers.subjectToSaleDays,
      subjectToSaleStage: buyerOffers.subjectToSaleStage,
      customConditions: buyerOffers.customConditions,
      entityName: entities.entityName,
      phoneNumber: entities.contact,
      emailAddress: entities.emailAddress,
    })
    .from(buyerOffers)
    .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
    .innerJoin(pandaProperties, eq(propertyEntities.propertyListId, pandaProperties.propertyListId))
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(
      and(
        eq(buyerOffers.isAccepted, true),
        inArray(propertyEntities.propertyListId, propertyListIds),
      ),
    )

  const result = new Map<number, AcceptedOfferEnrichment>()
  for (const row of rows) {
    if (row.propertyListId != null && !result.has(row.propertyListId)) {
      const contractPrice = row.offer != null ? String(row.offer) : null
      let commissionAmount: string | null = null
      if (contractPrice != null && row.commissionRate != null) {
        const raw = parseFloat(contractPrice) * parseFloat(String(row.commissionRate)) / 100
        const amount = Math.round(raw * 100) / 100
        commissionAmount = `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
      const addDays = (days: number | null) =>
        computeConditionDueDate({ contractDate: row.contractDate, days })
      const otherConditions =
        row.customConditions && row.customConditions.length > 0
          ? row.customConditions.map((c) => c.label).join(", ")
          : null
      result.set(row.propertyListId, {
        contractPrice,
        commissionAmount,
        coolingOffDate: row.noConditions ? null : addDays(row.coolingOffDays),
        buildingPestDate: addDays(row.buildingPestDays),
        financeDate: addDays(row.financeDays),
        dueDiligenceDate: addDays(row.dueDiligenceDays),
        saleOfPropertyDate: addDays(row.saleOfPropertyDays),
        unconditionalContractDate: addDays(row.unconditionalContractDays),
        completionDate: addDays(row.subjectToSaleDays),
        isCashOffer: row.buyerOfferIsCashOffer ?? null,
        noConditions: row.noConditions ?? null,
        isSubjectToSale: row.subjectToSaleStage != null,
        otherConditions,
        successfulBuyer: row.entityName ?? null,
        successfulBuyerPropertyEntityId: row.propertyEntityId ?? null,
        successfulBuyerEntityId: row.entityId ?? null,
        successfulBuyerPhoneNumber: row.phoneNumber ?? null,
        successfulBuyerEmailAddress: row.emailAddress ?? null,
      })
    }
  }
  return result
}

export type DueHighlightEnrichment = {
  active: boolean
  labels: string[]
  /** Warning tier: true when there is an upcoming (future) milestone and no green is active. */
  warning: boolean
  /** Display-ready warning label(s), e.g. "Finance, due in 3 days". */
  warningLabels: string[]
  /** "soon" (red, within 3 days) or "upcoming" (gold, further out); null when not warning. */
  warningTier: DueWarningTier | null
}

/**
 * Compute the "due-date green highlight" for every listed property. Runs over ALL ids (not just
 * those with an accepted offer) so a property with only a settlement date still lights up.
 */
export async function fetchDueHighlightByPropertyListId(
  propertyListIds: number[],
): Promise<Map<number, DueHighlightEnrichment>> {
  if (propertyListIds.length === 0) return new Map()

  const [propRows, offerRows] = await Promise.all([
    db
      .select({
        propertyListId: pandaProperties.propertyListId,
        contractDate: pandaProperties.contractDate,
        disclosureDate: pandaProperties.disclosureDate,
        settlementDate: pandaProperties.settlementDate,
        clearedAt: pandaProperties.dueHighlightClearedAt,
      })
      .from(pandaProperties)
      .where(inArray(pandaProperties.propertyListId, propertyListIds)),
    db
      .select({
        propertyListId: propertyEntities.propertyListId,
        noConditions: buyerOffers.noConditions,
        coolingOffDays: buyerOffers.coolingOffDays,
        financeDays: buyerOffers.financeDays,
        buildingPestDays: buyerOffers.buildingPestDays,
        dueDiligenceDays: buyerOffers.dueDiligenceDays,
        saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
        unconditionalContractDays: buyerOffers.unconditionalContractDays,
        subjectToSaleDays: buyerOffers.subjectToSaleDays,
        customConditions: buyerOffers.customConditions,
        settlementDate: buyerOffers.settlementDate,
      })
      .from(buyerOffers)
      .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
      .where(
        and(eq(buyerOffers.isAccepted, true), inArray(propertyEntities.propertyListId, propertyListIds)),
      ),
  ])

  const offerByProperty = new Map<number, (typeof offerRows)[number]>()
  for (const row of offerRows) {
    if (row.propertyListId != null && !offerByProperty.has(row.propertyListId)) {
      offerByProperty.set(row.propertyListId, row)
    }
  }

  const now = new Date()
  const result = new Map<number, DueHighlightEnrichment>()
  for (const prop of propRows) {
    if (prop.propertyListId == null) continue
    const offer = offerByProperty.get(prop.propertyListId)
    // Offer-first settlement, property fallback (avoids stale RP-import dates firing false greens).
    // Same mapping used by syncPropertyNextConditionDue so the highlight and the materialised
    // ordering value always agree.
    const candidates = buildDueDateCandidates(acceptedOfferDueDateSource(prop, offer))
    const { active, labels, warning, warningLabels, warningDaysUntil, warningTier } =
      computeDueHighlight({
        candidates,
        now,
        clearedAt: prop.clearedAt,
      })
    if (active || warning) {
      const displayWarningLabels =
        warning && warningDaysUntil != null
          ? warningLabels.map((label) => formatDueWarningLabel(label, warningDaysUntil))
          : []
      result.set(prop.propertyListId, {
        active,
        labels,
        warning,
        warningLabels: displayWarningLabels,
        warningTier,
      })
    }
  }
  return result
}

export async function fetchPrimaryBuyerContacts(
  items: Record<string, unknown>[],
): Promise<Map<number, PrimaryBuyerContactEnrichment>> {
  const toFetch = new Map<number, { phoneId: number | null; emailId: number | null }>()
  for (const item of items) {
    const propId = typeof item["propertyListId"] === "number" ? item["propertyListId"] : null
    if (propId == null) continue
    const phoneId = typeof item["primaryPhoneBuyerPropertyEntityId"] === "number" ? item["primaryPhoneBuyerPropertyEntityId"] : null
    const emailId = typeof item["primaryEmailBuyerPropertyEntityId"] === "number" ? item["primaryEmailBuyerPropertyEntityId"] : null
    if (phoneId != null || emailId != null) toFetch.set(propId, { phoneId, emailId })
  }
  if (toFetch.size === 0) return new Map()

  const allPeIds = [...new Set(
    [...toFetch.values()].flatMap(({ phoneId, emailId }) => [phoneId, emailId].filter((id): id is number => id != null))
  )]

  const rows = await db
    .select({
      propertyEntityId: propertyEntities.propertyEntityId,
      entityName: entities.entityName,
      phone: entities.contact,
      email: entities.emailAddress,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(inArray(propertyEntities.propertyEntityId, allPeIds))

  const contactByPeId = new Map(rows.map((r) => [r.propertyEntityId, r]))

  const result = new Map<number, PrimaryBuyerContactEnrichment>()
  for (const [propId, { phoneId, emailId }] of toFetch) {
    const phoneContact = phoneId != null ? contactByPeId.get(phoneId) : null
    const emailContact = emailId != null ? contactByPeId.get(emailId) : null
    result.set(propId, {
      phone: phoneContact?.phone?.trim() || null,
      email: emailContact?.email?.trim() || null,
      name: phoneContact?.entityName?.trim() || null,
      emailName: emailContact?.entityName?.trim() || null,
    })
  }
  return result
}
