import "server-only"

import { NextResponse } from "next/server"
import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { buyerOffers, entities, entityMembers, offerFormTokens, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

type BuyerOfferMember = {
  entityMemberId: number
  memberName: string
  memberAddress: string | null
  memberPhoneNumber: string | null
  memberEmailAddress: string | null
  isBuyersRepresentative: boolean
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    const rows = await db
      .select({
        buyerOfferId: buyerOffers.buyerOfferId,
        entityId: propertyEntities.entityId,
        entityName: entities.entityName,
        offer: buyerOffers.offer,
        isAccepted: buyerOffers.isAccepted,
        dateOffered: buyerOffers.dateOffered,
        createdAt: buyerOffers.createdAt,
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
        propertyEntityId: propertyEntities.propertyEntityId,
        offerFormToken: offerFormTokens.token,
        phoneNumber: entities.contact,
        emailAddress: entities.emailAddress,
        primaryPhoneMemberId: entities.primaryPhoneMemberId,
        primaryEmailMemberId: entities.primaryEmailMemberId,
      })
      .from(buyerOffers)
      .innerJoin(
        propertyEntities,
        eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId),
      )
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .leftJoin(
        offerFormTokens,
        and(
          eq(propertyEntities.propertyEntityId, offerFormTokens.propertyEntityId),
          eq(offerFormTokens.propertyListId, propertyListId),
        ),
      )
      .where(eq(propertyEntities.propertyListId, propertyListId))
      .orderBy(desc(buyerOffers.isAccepted), desc(buyerOffers.createdAt))

    // Separate entity_members query — no JOIN to avoid row explosion from multiple members.
    const uniqueEntityIds = [...new Set(rows.map((r) => r.entityId))]
    const memberRows =
      uniqueEntityIds.length > 0
        ? await db
            .select({
              entityMemberId: entityMembers.entityMemberId,
              entityId: entityMembers.entityId,
              memberName: entityMembers.memberName,
              propertyToSellAddress: entityMembers.propertyToSellAddress,
              memberAddress: entityMembers.memberAddress,
              memberPhoneNumber: entityMembers.memberPhoneNumber,
              memberEmailAddress: entityMembers.memberEmailAddress,
              isBuyersRepresentative: entityMembers.isBuyersRepresentative,
            })
            .from(entityMembers)
            .where(inArray(entityMembers.entityId, uniqueEntityIds))
            .orderBy(asc(entityMembers.entityMemberId))
        : []

    // Rep priority: rep's propertyToSellAddress → rep's memberAddress → first member's propertyToSellAddress → first member's memberAddress
    const memberPropertyToSellAddressById = new Map<number, string | null>()
    // Member full names per entity, in entity_member_id order (matches the buyer members list).
    const memberNamesById = new Map<number, string[]>()
    // Full member rows per entity, in entity_member_id order (drives the successful-buyer member rows).
    const membersById = new Map<number, BuyerOfferMember[]>()
    for (const m of memberRows) {
      if (!memberPropertyToSellAddressById.has(m.entityId) || m.isBuyersRepresentative) {
        memberPropertyToSellAddressById.set(m.entityId, m.propertyToSellAddress ?? m.memberAddress ?? null)
      }
      const names = memberNamesById.get(m.entityId)
      if (names) names.push(m.memberName)
      else memberNamesById.set(m.entityId, [m.memberName])

      const member: BuyerOfferMember = {
        entityMemberId: m.entityMemberId,
        memberName: m.memberName,
        memberAddress: m.memberAddress,
        memberPhoneNumber: m.memberPhoneNumber,
        memberEmailAddress: m.memberEmailAddress,
        isBuyersRepresentative: m.isBuyersRepresentative,
      }
      const members = membersById.get(m.entityId)
      if (members) members.push(member)
      else membersById.set(m.entityId, [member])
    }

    const response = rows.map(({ entityId, ...row }) => ({
      ...row,
      entityId,
      memberPropertyToSellAddress: memberPropertyToSellAddressById.get(entityId) ?? null,
      memberNames: memberNamesById.get(entityId) ?? [],
      members: membersById.get(entityId) ?? [],
    }))

    return NextResponse.json(response)
  } catch (cause) {
    console.error(`[GET /api/admin/properties/${propertyListId}/buyer-offers]`, cause)
    return adminJsonError("Failed to load buyer offers", 500)
  }
}
