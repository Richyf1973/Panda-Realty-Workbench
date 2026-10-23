import "server-only"

import { and, eq, ne } from "drizzle-orm"

import { db } from "@/db"
import { entityMembers } from "@/db/schema"

/**
 * Clears the flag on all other members of the same entity so the given row can
 * be set representative without violating the partial unique index.
 */
export async function clearOtherBuyersRepresentativesForEntity(
  entityId: number,
  keepEntityMemberId: number,
): Promise<void> {
  await db
    .update(entityMembers)
    .set({ isBuyersRepresentative: false, updatedAt: new Date() })
    .where(
      and(
        eq(entityMembers.entityId, entityId),
        ne(entityMembers.entityMemberId, keepEntityMemberId),
      ),
    )
}

/** Clears the representative flag on every member for this entity (e.g. before POST with rep=true). */
export async function clearAllBuyersRepresentativesForEntity(
  entityId: number,
): Promise<void> {
  await db
    .update(entityMembers)
    .set({ isBuyersRepresentative: false, updatedAt: new Date() })
    .where(eq(entityMembers.entityId, entityId))
}
