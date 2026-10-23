"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { propertyListNotes } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function addPropertyNote(
  propertyListId: number,
  note: string,
  agentId?: number | null,
  propertyEntityId?: number | null,
  ownerNum?: number | null,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(propertyListId) || propertyListId <= 0) {
    return { success: false, error: "Invalid property ID" }
  }
  const trimmed = note.trim()
  if (!trimmed) return { success: false, error: "Note cannot be empty" }

  await db.insert(propertyListNotes).values({
    propertyListId,
    note: trimmed,
    createdBy: user.email ?? null,
    agentId: agentId ?? null,
    propertyEntityId: propertyEntityId ?? null,
    ownerNum: ownerNum ?? null,
  })

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
  return { success: true }
}
