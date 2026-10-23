"use server"

import { asc, and, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import {
  agents,
  buyerOffers,
  buyerPreferredFeatures,
  buyerRequirement,
  buyerStatus,
  entities,
  entityBuyerRequirements,
  entityBuyerStatuses,
  pandaProperties,
  propertyEntities,
  propertyEntityNotes,
  propertyMeetings,
  propertyStatus,
} from "@/db/schema"
import type { PropertyDetailMeeting } from "./property-types"
import { getSessionUser } from "@/lib/auth/session"
import type { BuyerDetail, BuyerPropertyEntry } from "./buyer-types"

export async function fetchBuyerDetail(propertyEntityIds: number[]): Promise<BuyerDetail | null> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")

  if (propertyEntityIds.length === 0) return null

  const linkRows = await db
    .select({
      propertyEntityId: propertyEntities.propertyEntityId,
      entityId: propertyEntities.entityId,
      entityName: entities.entityName,
      phoneNumber: entities.contact,
      emailAddress: entities.emailAddress,
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      propertyType: pandaProperties.propertyType,
      contractDate: pandaProperties.contractDate,
      buyerPipelineStatusId: propertyEntities.buyerPipelineStatusId,
      stageName: propertyStatus.propertyStatus,
      salePrice: pandaProperties.salePrice,
      appraisedAmount: pandaProperties.appraisedAmount,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .innerJoin(pandaProperties, eq(propertyEntities.propertyListId, pandaProperties.propertyListId))
    .leftJoin(propertyStatus, eq(propertyEntities.buyerPipelineStatusId, propertyStatus.propertyStatusId))
    .where(inArray(propertyEntities.propertyEntityId, propertyEntityIds))
    .orderBy(asc(propertyEntities.propertyEntityId))

  if (linkRows.length === 0) return null

  const firstRow = linkRows[0]!
  const entityId = firstRow.entityId

  const [offersAll, notesAll, meetingsAll, buyerStatusesRaw, preferredFeaturesRaw, buyerRequirementsRaw, agentsRaw] =
    await Promise.all([
      db
        .select({
          propertyEntityId: buyerOffers.propertyEntityId,
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
        })
        .from(buyerOffers)
        .where(inArray(buyerOffers.propertyEntityId, propertyEntityIds))
        .orderBy(desc(buyerOffers.dateOffered), desc(buyerOffers.buyerOfferId)),

      db
        .select({
          propertyEntityId: propertyEntityNotes.propertyEntityId,
          propertyEntityNoteId: propertyEntityNotes.propertyEntityNoteId,
          note: propertyEntityNotes.note,
          createdBy: propertyEntityNotes.createdBy,
          agentId: propertyEntityNotes.agentId,
          agentName: agents.agentName,
          createdAt: propertyEntityNotes.createdAt,
        })
        .from(propertyEntityNotes)
        .leftJoin(agents, eq(propertyEntityNotes.agentId, agents.agentId))
        .where(inArray(propertyEntityNotes.propertyEntityId, propertyEntityIds))
        .orderBy(desc(propertyEntityNotes.createdAt), desc(propertyEntityNotes.propertyEntityNoteId)),

      db
        .select({
          propertyMeetingId: propertyMeetings.propertyMeetingId,
          propertyEntityId: propertyMeetings.propertyEntityId,
          type: propertyMeetings.type,
          title: propertyMeetings.title,
          scheduledAt: propertyMeetings.scheduledAt,
          durationMinutes: propertyMeetings.durationMinutes,
          notes: propertyMeetings.notes,
          googleCalendarEventId: propertyMeetings.googleCalendarEventId,
          buyerName: entities.entityName,
        })
        .from(propertyMeetings)
        .leftJoin(propertyEntities, eq(propertyMeetings.propertyEntityId, propertyEntities.propertyEntityId))
        .leftJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(inArray(propertyMeetings.propertyEntityId, propertyEntityIds))
        .orderBy(asc(propertyMeetings.scheduledAt)),

      db
        .select({
          entityBuyerStatusId: entityBuyerStatuses.entityBuyerStatusId,
          buyerStatusId: entityBuyerStatuses.buyerStatusId,
          buyerStatus: buyerStatus.buyerStatus,
        })
        .from(entityBuyerStatuses)
        .innerJoin(buyerStatus, eq(entityBuyerStatuses.buyerStatusId, buyerStatus.buyerStatusId))
        .where(eq(entityBuyerStatuses.entityId, entityId))
        .orderBy(asc(entityBuyerStatuses.entityBuyerStatusId)),

      db
        .select({
          buyerPreferredFeatureId: buyerPreferredFeatures.buyerPreferredFeatureId,
          feature: buyerPreferredFeatures.feature,
          createdAt: buyerPreferredFeatures.createdAt,
        })
        .from(buyerPreferredFeatures)
        .where(eq(buyerPreferredFeatures.entityId, entityId))
        .orderBy(asc(buyerPreferredFeatures.feature)),

      db
        .select({
          entityBuyerRequirementId: entityBuyerRequirements.entityBuyerRequirementId,
          buyerRequirementId: entityBuyerRequirements.buyerRequirementId,
          requirement: buyerRequirement.requirement,
          value: entityBuyerRequirements.value,
        })
        .from(entityBuyerRequirements)
        .innerJoin(buyerRequirement, eq(entityBuyerRequirements.buyerRequirementId, buyerRequirement.buyerRequirementId))
        .where(eq(entityBuyerRequirements.entityId, entityId))
        .orderBy(asc(buyerRequirement.requirement)),

      db
        .select({ agentId: agents.agentId, agentName: agents.agentName, agentEmail: agents.email })
        .from(agents)
        .orderBy(asc(agents.agentName)),
    ])

  // Group per-property rows by propertyEntityId
  const offersByPEId = new Map<number, BuyerPropertyEntry["offers"]>()
  for (const o of offersAll) {
    const bucket = offersByPEId.get(o.propertyEntityId) ?? []
    const { propertyEntityId: _id, ...offerData } = o
    bucket.push(offerData)
    offersByPEId.set(o.propertyEntityId, bucket)
  }

  const notesByPEId = new Map<number, BuyerPropertyEntry["notes"]>()
  for (const n of notesAll) {
    const bucket = notesByPEId.get(n.propertyEntityId) ?? []
    const { propertyEntityId: _id, ...noteData } = n
    bucket.push(noteData)
    notesByPEId.set(n.propertyEntityId, bucket)
  }

  const meetingsByPEId = new Map<number, PropertyDetailMeeting[]>()
  for (const m of meetingsAll) {
    if (m.propertyEntityId == null) continue
    const bucket = meetingsByPEId.get(m.propertyEntityId) ?? []
    bucket.push({
      propertyMeetingId: m.propertyMeetingId,
      propertyEntityId: m.propertyEntityId,
      type: m.type as "meeting" | "reminder",
      title: m.title,
      scheduledAt: m.scheduledAt,
      durationMinutes: m.durationMinutes,
      notes: m.notes,
      googleCalendarEventId: m.googleCalendarEventId,
      buyerName: m.buyerName ?? null,
    })
    meetingsByPEId.set(m.propertyEntityId, bucket)
  }

  const properties: BuyerPropertyEntry[] = linkRows.map((row) => ({
    propertyEntityId: row.propertyEntityId,
    propertyListId: row.propertyListId,
    streetAddress: row.streetAddress,
    suburb: row.suburb,
    propertyType: row.propertyType,
    contractDate: row.contractDate,
    buyerPipelineStatusId: row.buyerPipelineStatusId,
    stageName: row.stageName,
    salePrice: row.salePrice,
    appraisedAmount: row.appraisedAmount,
    offers: offersByPEId.get(row.propertyEntityId) ?? [],
    notes: notesByPEId.get(row.propertyEntityId) ?? [],
    meetings: meetingsByPEId.get(row.propertyEntityId) ?? [],
  }))

  return {
    entityId,
    entityName: firstRow.entityName,
    phoneNumber: firstRow.phoneNumber,
    emailAddress: firstRow.emailAddress,
    agents: agentsRaw,
    buyerStatuses: buyerStatusesRaw,
    preferredFeatures: preferredFeaturesRaw,
    buyerRequirements: buyerRequirementsRaw,
    properties,
  }
}
