"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { propertyEntityNotes } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function addEntityNote(
  propertyEntityId: number,
  note: string,
  agentId?: number | null,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: "Unauthorized" }

  if (!Number.isInteger(propertyEntityId) || propertyEntityId <= 0) {
    return { success: false, error: "Invalid property entity ID" }
  }
  const trimmed = note.trim()
  if (!trimmed) return { success: false, error: "Note cannot be empty" }

  await db.insert(propertyEntityNotes).values({
    propertyEntityId,
    note: trimmed,
    createdBy: user.email ?? null,
    agentId: agentId ?? null,
  })

  revalidatePath("/admin/properties", "page")
  revalidatePath("/admin/pipeline", "page")
  return { success: true }
}
