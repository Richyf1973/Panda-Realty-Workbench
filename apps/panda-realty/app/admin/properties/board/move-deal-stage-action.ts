"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function moveDealToStage(
  propertyListId: number,
  dealStatusId: number,
): Promise<void> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  if (!Number.isFinite(propertyListId) || !Number.isFinite(dealStatusId)) {
    throw new Error("Invalid arguments")
  }

  await db
    .update(pandaProperties)
    .set({ dealStageStatusId: dealStatusId, updatedAt: new Date() })
    .where(eq(pandaProperties.propertyListId, propertyListId))

  revalidatePath("/admin/properties")
  revalidatePath("/admin/pipeline")
}
