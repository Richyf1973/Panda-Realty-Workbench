"use server"

import { revalidatePath } from "next/cache"
import { eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties, propertyStatus } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function movePropertyToStage(
  propertyListId: number,
  propertyStatusId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(propertyListId) || propertyListId <= 0)
    return { success: false, error: "Invalid property ID" }
  if (!Number.isInteger(propertyStatusId) || propertyStatusId <= 0)
    return { success: false, error: "Invalid status ID" }

  const statusRow = await db
    .select({ propertyStatusCode: propertyStatus.propertyStatusCode })
    .from(propertyStatus)
    .where(eq(propertyStatus.propertyStatusId, propertyStatusId))
    .limit(1)

  const isSaleContractSigned =
    statusRow[0]?.propertyStatusCode === "Sale Contract Signed"

  await db
    .update(pandaProperties)
    .set({
      propertyStatusId,
      ...(isSaleContractSigned
        ? { contractDate: sql`COALESCE(${pandaProperties.contractDate}, NOW())` }
        : {}),
    })
    .where(eq(pandaProperties.propertyListId, propertyListId))

  return { success: true }
}

export async function reorderPipelineStages(orderedStatusIds: number[]): Promise<void> {
  const user = await getSessionUser()
  if (!user) return

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedStatusIds.length; i++) {
      await tx
        .update(propertyStatus)
        .set({ sortOrder: i + 1 })
        .where(eq(propertyStatus.propertyStatusId, orderedStatusIds[i]!))
    }
  })

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
}
