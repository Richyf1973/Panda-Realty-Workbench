"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, pandaProperties, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export type OfferConditionsPayload = {
  propertyListId: number
  contractDate: Date | null
  isCashOffer: boolean
  noConditions: boolean
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  subjectToSaleDays: number | null
  subjectToSaleStage: string | null
  subjectToSaleAddress: string | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  depositInitial: number | null
  depositBalance: number | null
  customConditions: Array<{ label: string; days: number }>
  conditionNotes: string | null
}

export async function updateOfferConditions(
  buyerOfferId: number,
  payload: OfferConditionsPayload,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(buyerOfferId) || buyerOfferId <= 0) {
    return { success: false, error: "Invalid offer ID" }
  }
  if (!Number.isInteger(payload.propertyListId) || payload.propertyListId <= 0) {
    return { success: false, error: "Invalid property ID" }
  }
  if (payload.depositInitial !== null && !Number.isFinite(payload.depositInitial)) {
    return { success: false, error: "Invalid deposit amount" }
  }
  if (payload.depositBalance !== null && !Number.isFinite(payload.depositBalance)) {
    return { success: false, error: "Invalid deposit amount" }
  }

  const link = await db
    .select({ propertyListId: propertyEntities.propertyListId })
    .from(buyerOffers)
    .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
    .where(eq(buyerOffers.buyerOfferId, buyerOfferId))
    .limit(1)

  if (!link[0] || link[0].propertyListId !== payload.propertyListId) {
    return { success: false, error: "Offer does not match this property" }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(buyerOffers)
      .set({
        isCashOffer: payload.isCashOffer,
        noConditions: payload.noConditions,
        coolingOffDays: payload.coolingOffDays,
        financeDays: payload.financeDays,
        buildingPestDays: payload.buildingPestDays,
        dueDiligenceDays: payload.dueDiligenceDays,
        subjectToSaleDays: payload.subjectToSaleDays,
        subjectToSaleStage: payload.subjectToSaleStage,
        subjectToSaleAddress: payload.subjectToSaleAddress,
        saleOfPropertyDays: payload.saleOfPropertyDays,
        unconditionalContractDays: payload.unconditionalContractDays,
        depositInitial: payload.depositInitial !== null ? String(payload.depositInitial) : null,
        depositBalance: payload.depositBalance !== null ? String(payload.depositBalance) : null,
        customConditions: payload.customConditions.length > 0 ? payload.customConditions : null,
        conditionNotes: payload.conditionNotes,
        updatedAt: new Date(),
      })
      .where(eq(buyerOffers.buyerOfferId, buyerOfferId))

    await tx
      .update(pandaProperties)
      .set({
        contractDate: payload.contractDate,
        updatedAt: new Date(),
      })
      .where(eq(pandaProperties.propertyListId, payload.propertyListId))
  })

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
  revalidatePath("/admin/calendar", "page")
  return { success: true }
}
