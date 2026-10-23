"use server"

import { asc, desc, eq, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { db } from "@/db"
import {
  agents,
  buyerOffers,
  entities,
  entityMembers,
  pandaProperties,
  propertyEntities,
  propertyEntityFiles,
  propertyEntityNotes,
  propertyListFiles,
  propertyListNotes,
  propertyMeetings,
  propertyStatus,
} from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

import {
  assembleBuyers,
  assembleContacts,
  assembleMeetings,
  assembleNotes,
  assembleOffers,
  groupOffersByEntityId,
} from "./property-detail-assembler"
import { buildMemberAddressMaps } from "./property-member-address-maps"

export type {
  DealStage,
  PropertyDetail,
  PropertyDetailAgent,
  PropertyDetailBuyer,
  PropertyDetailContact,
  PropertyDetailFile,
  PropertyDetailMeeting,
  PropertyDetailNote,
  PropertyDetailOffer,
  PropertyDetailProperty,
} from "./property-types"

import type { PropertyDetail } from "./property-types"

export async function fetchPropertyDetail(propertyListId: number): Promise<PropertyDetail> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")

  const dealStageStatus = alias(propertyStatus, "deal_stage_status")

  // Round 1: property + entities + deal stages + property-level notes + agents + meetings + property-level files in parallel
  const [propertyRow, allEntities, dealStagesRaw, propertyNotesRaw, agentsRaw, meetingsRaw, propertyFilesRaw] = await Promise.all([
    db
      .select({
        propertyListId: pandaProperties.propertyListId,
        streetAddress: pandaProperties.streetAddress,
        suburb: pandaProperties.suburb,
        state: pandaProperties.state,
        postcode: pandaProperties.postcode,
        propertyType: pandaProperties.propertyType,
        salePrice: pandaProperties.salePrice,
        appraisedAmount: pandaProperties.appraisedAmount,
        commissionRate: pandaProperties.commissionRate,
        createdAt: pandaProperties.createdAt,
        isWon: pandaProperties.isWon,
        isLost: pandaProperties.isLost,
        propertyStatusId: pandaProperties.propertyStatusId,
        stageName: propertyStatus.propertyStatus,
        contractDate: pandaProperties.contractDate,
        dealStageStatusId: pandaProperties.dealStageStatusId,
        dealStageName: dealStageStatus.propertyStatus,
        owner1name: pandaProperties.owner1name,
        owner1phone: pandaProperties.owner1phone,
        owner1email: pandaProperties.owner1email,
        owner2name: pandaProperties.owner2name,
        owner2phone: pandaProperties.owner2phone,
        owner2email: pandaProperties.owner2email,
        owner3name: pandaProperties.owner3name,
        owner3phone: pandaProperties.owner3phone,
        owner3email: pandaProperties.owner3email,
      })
      .from(pandaProperties)
      .leftJoin(propertyStatus, eq(pandaProperties.propertyStatusId, propertyStatus.propertyStatusId))
      .leftJoin(dealStageStatus, eq(pandaProperties.dealStageStatusId, dealStageStatus.propertyStatusId))
      .where(eq(pandaProperties.propertyListId, propertyListId))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    db
      .select({
        propertyEntityId: propertyEntities.propertyEntityId,
        entityId: propertyEntities.entityId,
        entityName: entities.entityName,
        phoneNumber: entities.contact,
        emailAddress: entities.emailAddress,
        entityCategoryId: entities.entityCategoryId,
        association: entities.association,
      })
      .from(propertyEntities)
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(eq(propertyEntities.propertyListId, propertyListId))
      .orderBy(asc(propertyEntities.propertyEntityId)),

    db
      .select({
        propertyStatusId: propertyStatus.propertyStatusId,
        stageName: propertyStatus.propertyStatus,
        sortOrder: propertyStatus.sortOrder,
      })
      .from(propertyStatus)
      .where(eq(propertyStatus.pipeline, "deal"))
      .orderBy(asc(propertyStatus.sortOrder)),

    db
      .select({
        propertyListNoteId: propertyListNotes.propertyListNoteId,
        note: propertyListNotes.note,
        createdBy: propertyListNotes.createdBy,
        createdAt: propertyListNotes.createdAt,
        agentId: propertyListNotes.agentId,
        agentName: agents.agentName,
        agentEmail: agents.email,
        propertyEntityId: propertyListNotes.propertyEntityId,
        entityName: entities.entityName,
      })
      .from(propertyListNotes)
      .leftJoin(agents, eq(propertyListNotes.agentId, agents.agentId))
      .leftJoin(propertyEntities, eq(propertyListNotes.propertyEntityId, propertyEntities.propertyEntityId))
      .leftJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(eq(propertyListNotes.propertyListId, propertyListId))
      .orderBy(desc(propertyListNotes.createdAt), desc(propertyListNotes.propertyListNoteId)),

    db
      .select({
        agentId: agents.agentId,
        agentName: agents.agentName,
        agentEmail: agents.email,
      })
      .from(agents)
      .orderBy(asc(agents.agentName)),

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
        entityName: entities.entityName,
      })
      .from(propertyMeetings)
      .leftJoin(propertyEntities, eq(propertyMeetings.propertyEntityId, propertyEntities.propertyEntityId))
      .leftJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(eq(propertyMeetings.propertyListId, propertyListId))
      .orderBy(asc(propertyMeetings.scheduledAt)),

    db
      .select({
        propertyListFileId: propertyListFiles.propertyListFileId,
        fileName: propertyListFiles.fileName,
        fileType: propertyListFiles.fileType,
        fileSize: propertyListFiles.fileSize,
        fileLink: propertyListFiles.fileLink,
        googleDriveFileId: propertyListFiles.googleDriveFileId,
        sharedWithPortal: propertyListFiles.sharedWithPortal,
        sharedWithSeller: propertyListFiles.sharedWithSeller,
      })
      .from(propertyListFiles)
      .where(eq(propertyListFiles.propertyListId, propertyListId))
      .orderBy(asc(propertyListFiles.propertyListFileId)),
  ])

  const allEntityIds = allEntities.map((e) => e.propertyEntityId)

  // Entity category IDs from DB: 1=Buyer, 2=Seller, 3=Tenant, 4=Contact
  const buyerEntities = allEntities.filter((e) => e.entityCategoryId === 1)
  const buyerEntityIds = buyerEntities.map((e) => e.entityId)

  // Round 2: offers, notes, entity-level files in parallel (depend on allEntityIds)
  const [offersRaw, notesRaw, entityFilesRaw] =
    allEntityIds.length > 0
      ? await Promise.all([
          db
            .select({
              buyerOfferId: buyerOffers.buyerOfferId,
              propertyEntityId: buyerOffers.propertyEntityId,
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
            .where(inArray(buyerOffers.propertyEntityId, allEntityIds))
            .orderBy(asc(buyerOffers.dateOffered), asc(buyerOffers.buyerOfferId)),

          db
            .select({
              propertyEntityNoteId: propertyEntityNotes.propertyEntityNoteId,
              propertyEntityId: propertyEntityNotes.propertyEntityId,
              note: propertyEntityNotes.note,
              createdBy: propertyEntityNotes.createdBy,
              createdAt: propertyEntityNotes.createdAt,
            })
            .from(propertyEntityNotes)
            .where(inArray(propertyEntityNotes.propertyEntityId, allEntityIds))
            .orderBy(desc(propertyEntityNotes.createdAt), desc(propertyEntityNotes.propertyEntityNoteId)),

          db
            .select({
              propertyEntityFileId: propertyEntityFiles.propertyEntityFileId,
              fileName: propertyEntityFiles.fileName,
              fileType: propertyEntityFiles.fileType,
              fileSize: propertyEntityFiles.fileSize,
              fileLink: propertyEntityFiles.fileLink,
              googleDriveFileId: propertyEntityFiles.googleDriveFileId,
              sharedWithPortal: propertyEntityFiles.sharedWithPortal,
              sharedWithSeller: propertyEntityFiles.sharedWithSeller,
            })
            .from(propertyEntityFiles)
            .where(inArray(propertyEntityFiles.propertyEntityId, allEntityIds))
            .orderBy(asc(propertyEntityFiles.propertyEntityFileId)),
        ])
      : [[], [], []]

  const memberAddressRows =
    buyerEntityIds.length > 0
      ? await db
          .select({
            entityId: entityMembers.entityId,
            propertyToSellAddress: entityMembers.propertyToSellAddress,
            memberAddress: entityMembers.memberAddress,
            isBuyersRepresentative: entityMembers.isBuyersRepresentative,
          })
          .from(entityMembers)
          .where(inArray(entityMembers.entityId, buyerEntityIds))
          .orderBy(asc(entityMembers.entityMemberId))
      : ([] as Array<{ entityId: number; propertyToSellAddress: string | null; memberAddress: string | null; isBuyersRepresentative: boolean }>)

  const { memberPropertyToSellAddressById, memberResidenceAddressById } = buildMemberAddressMaps(memberAddressRows)

  const contactEntities = allEntities.filter((e) => e.entityCategoryId === 4)
  const entityNameById = new Map(allEntities.map((e) => [e.propertyEntityId, e.entityName]))

  const buyers = assembleBuyers(buyerEntities, groupOffersByEntityId(offersRaw), memberPropertyToSellAddressById, memberResidenceAddressById)
  const contacts = assembleContacts(contactEntities)
  const offers = assembleOffers(offersRaw, entityNameById)
  const notes = assembleNotes(notesRaw, propertyNotesRaw, entityNameById)
  const meetings = assembleMeetings(meetingsRaw)

  const files: PropertyDetail["files"] = [
    ...propertyFilesRaw.map((f) => ({
      fileId: f.propertyListFileId,
      kind: "property" as const,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      fileLink: f.fileLink,
      googleDriveFileId: f.googleDriveFileId,
      sharedWithPortal: f.sharedWithPortal,
      sharedWithSeller: f.sharedWithSeller,
    })),
    ...entityFilesRaw.map((f) => ({
      fileId: f.propertyEntityFileId,
      kind: "entity" as const,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      fileLink: f.fileLink,
      googleDriveFileId: f.googleDriveFileId,
      sharedWithPortal: f.sharedWithPortal,
      sharedWithSeller: f.sharedWithSeller,
    })),
  ]

  return {
    property: propertyRow,
    buyers,
    contacts,
    notes,
    files,
    offers: offers.sort((a, b) => b.dateOffered.localeCompare(a.dateOffered)),
    meetings,
    primaryPropertyEntityId: buyers[0]?.propertyEntityId ?? contacts[0]?.propertyEntityId ?? null,
    dealStages: dealStagesRaw,
    agents: agentsRaw,
  }
}
