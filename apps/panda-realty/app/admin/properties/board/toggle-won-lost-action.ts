"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function togglePropertyWon(
  propertyListId: number,
  currentValue: boolean,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(propertyListId) || propertyListId <= 0) {
    return { success: false, error: "Invalid property ID" }
  }

  await db
    .update(pandaProperties)
    .set({ isWon: !currentValue })
    .where(eq(pandaProperties.propertyListId, propertyListId))

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
  return { success: true }
}

export async function togglePropertyLost(
  propertyListId: number,
  currentValue: boolean,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(propertyListId) || propertyListId <= 0) {
    return { success: false, error: "Invalid property ID" }
  }

  await db
    .update(pandaProperties)
    .set({ isLost: !currentValue })
    .where(eq(pandaProperties.propertyListId, propertyListId))

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
  return { success: true }
}
