"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { propertyStatus } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function reorderPropertyStatuses(
  orderedIds: number[],
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Array.isArray(orderedIds) || orderedIds.length === 0)
    return { success: false, error: "Invalid order" }

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]!
      await tx
        .update(propertyStatus)
        .set({ sortOrder: i + 1 })
        .where(eq(propertyStatus.propertyStatusId, id))
    }
  })

  revalidatePath("/admin/property-status")
  revalidatePath("/admin/pipeline")

  return { success: true }
}
