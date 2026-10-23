"use server"

import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerPreferredFeatures } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function addBuyerPreferredFeature(
  entityId: number,
  feature: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(entityId) || entityId <= 0)
    return { success: false, error: "Invalid entity ID" }

  const trimmed = feature.trim()
  if (!trimmed) return { success: false, error: "Feature cannot be empty" }
  if (trimmed.length > 200) return { success: false, error: "Feature is too long" }

  await db.insert(buyerPreferredFeatures).values({
    entityId,
    feature: trimmed,
  })

  return { success: true }
}

export async function removeBuyerPreferredFeature(
  buyerPreferredFeatureId: number,
  entityId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(buyerPreferredFeatureId) || buyerPreferredFeatureId <= 0)
    return { success: false, error: "Invalid feature ID" }

  await db
    .delete(buyerPreferredFeatures)
    .where(
      and(
        eq(buyerPreferredFeatures.buyerPreferredFeatureId, buyerPreferredFeatureId),
        eq(buyerPreferredFeatures.entityId, entityId),
      ),
    )

  return { success: true }
}
