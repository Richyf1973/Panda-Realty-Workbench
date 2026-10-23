import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { offerFormTokens } from "@/db/schema"

export async function getOrCreateOfferFormToken(
  propertyEntityId: number,
  propertyListId: number,
): Promise<typeof offerFormTokens.$inferSelect> {
  const existing = await db
    .select()
    .from(offerFormTokens)
    .where(eq(offerFormTokens.propertyEntityId, propertyEntityId))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (existing) return existing

  const [created] = await db
    .insert(offerFormTokens)
    .values({ propertyEntityId, propertyListId, token: crypto.randomUUID() })
    .returning()

  return created
}
