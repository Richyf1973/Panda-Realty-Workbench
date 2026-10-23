"use server"

import { and, asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerRequirement, entityBuyerRequirements } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function fetchEntityBuyerRequirements(entityId: number): Promise<
  Array<{ entityBuyerRequirementId: number; buyerRequirementId: number; requirement: string; value: string | null }>
> {
  return db
    .select({
      entityBuyerRequirementId: entityBuyerRequirements.entityBuyerRequirementId,
      buyerRequirementId: entityBuyerRequirements.buyerRequirementId,
      requirement: buyerRequirement.requirement,
      value: entityBuyerRequirements.value,
    })
    .from(entityBuyerRequirements)
    .innerJoin(buyerRequirement, eq(entityBuyerRequirements.buyerRequirementId, buyerRequirement.buyerRequirementId))
    .where(eq(entityBuyerRequirements.entityId, entityId))
    .orderBy(asc(buyerRequirement.requirement))
}

export async function fetchAllBuyerRequirements(): Promise<
  Array<{ buyerRequirementId: number; requirement: string }>
> {
  return db
    .select({
      buyerRequirementId: buyerRequirement.buyerRequirementId,
      requirement: buyerRequirement.requirement,
    })
    .from(buyerRequirement)
    .orderBy(asc(buyerRequirement.requirement))
}

export async function addEntityBuyerRequirement(
  entityId: number,
  buyerRequirementId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(entityId) || entityId <= 0)
    return { success: false, error: "Invalid entity ID" }

  if (!Number.isInteger(buyerRequirementId) || buyerRequirementId <= 0)
    return { success: false, error: "Invalid requirement ID" }

  const existing = await db
    .select({ entityBuyerRequirementId: entityBuyerRequirements.entityBuyerRequirementId })
    .from(entityBuyerRequirements)
    .where(
      and(
        eq(entityBuyerRequirements.entityId, entityId),
        eq(entityBuyerRequirements.buyerRequirementId, buyerRequirementId),
      ),
    )
    .limit(1)

  if (existing.length > 0) return { success: true }

  await db.insert(entityBuyerRequirements).values({ entityId, buyerRequirementId })

  return { success: true }
}

export async function removeEntityBuyerRequirement(
  entityBuyerRequirementId: number,
  entityId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(entityBuyerRequirementId) || entityBuyerRequirementId <= 0)
    return { success: false, error: "Invalid requirement ID" }

  await db
    .delete(entityBuyerRequirements)
    .where(
      and(
        eq(entityBuyerRequirements.entityBuyerRequirementId, entityBuyerRequirementId),
        eq(entityBuyerRequirements.entityId, entityId),
      ),
    )

  return { success: true }
}

export async function updateEntityBuyerRequirementValue(
  entityBuyerRequirementId: number,
  entityId: number,
  value: string | null,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(entityBuyerRequirementId) || entityBuyerRequirementId <= 0)
    return { success: false, error: "Invalid requirement ID" }

  await db
    .update(entityBuyerRequirements)
    .set({ value: value || null })
    .where(
      and(
        eq(entityBuyerRequirements.entityBuyerRequirementId, entityBuyerRequirementId),
        eq(entityBuyerRequirements.entityId, entityId),
      ),
    )

  return { success: true }
}
