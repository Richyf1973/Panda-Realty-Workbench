"use server"

import { revalidatePath } from "next/cache"
import { eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

/** Clears the due-date green highlight for a property (stamps `due_highlight_cleared_at = now()`). */
export async function clearDueHighlight(
  propertyListId: number,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }
  if (!Number.isInteger(propertyListId) || propertyListId <= 0)
    return { success: false, error: "Invalid property ID" }

  await db
    .update(pandaProperties)
    .set({ dueHighlightClearedAt: sql`now()` })
    .where(eq(pandaProperties.propertyListId, propertyListId))

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
  return { success: true }
}
