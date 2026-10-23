"use server"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function moveBuyerToStage(
  propertyEntityId: number,
  newStatusId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(propertyEntityId) || propertyEntityId <= 0)
    return { success: false, error: "Invalid property entity ID" }
  if (!Number.isInteger(newStatusId) || newStatusId <= 0)
    return { success: false, error: "Invalid status ID" }

  await db
    .update(propertyEntities)
    .set({ buyerPipelineStatusId: newStatusId, updatedAt: new Date() })
    .where(eq(propertyEntities.propertyEntityId, propertyEntityId))

  return { success: true }
}
