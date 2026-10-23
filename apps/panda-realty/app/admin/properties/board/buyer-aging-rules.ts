import "server-only"

import { and, eq, inArray, lte, sql } from "drizzle-orm"

import { db } from "@/db"
import { propertyEntities } from "@/db/schema"
import { BUYER_AGING } from "@/lib/admin/buyer-aging"

/**
 * Applies buyer pipeline aging rules, moving buyers forward through aging stages
 * based on how many days have elapsed since property_entities.created_at.
 * Called at render time on the buyers pipeline page before fetching cards.
 * Only moves buyers forward — never backward.
 */
export async function applyBuyerAgingRules(): Promise<void> {
  const now = new Date()
  const redCutoff = new Date(now.getTime() - BUYER_AGING.THRESHOLDS_DAYS.RED * 86_400_000)
  const amberCutoff = new Date(now.getTime() - BUYER_AGING.THRESHOLDS_DAYS.AMBER * 86_400_000)

  // Step 1: Archive 180+ day buyers from Active Buyers OR Active 3-6 months (forward only)
  // updatedAt bypass: set updated_at = updated_at so the trigger (which fires only when
  // updated_at IS NULL) does not reset the aging clock for new buyers on their first auto-move.
  await db
    .update(propertyEntities)
    .set({ buyerPipelineStatusId: BUYER_AGING.STAGE_IDS.ARCHIVED, updatedAt: sql`updated_at` })
    .where(
      and(
        inArray(propertyEntities.buyerPipelineStatusId, [
          BUYER_AGING.STAGE_IDS.ACTIVE_BUYERS,
          BUYER_AGING.STAGE_IDS.ACTIVE_3_TO_6_MONTHS,
        ]),
        lte(propertyEntities.createdAt, redCutoff),
      ),
    )

  // Step 2: Move 90-179 day buyers from Active Buyers → Active 3-6 months
  // (180+ day buyers from Active Buyers were already moved to Archived in step 1)
  await db
    .update(propertyEntities)
    .set({ buyerPipelineStatusId: BUYER_AGING.STAGE_IDS.ACTIVE_3_TO_6_MONTHS, updatedAt: sql`updated_at` })
    .where(
      and(
        eq(propertyEntities.buyerPipelineStatusId, BUYER_AGING.STAGE_IDS.ACTIVE_BUYERS),
        lte(propertyEntities.createdAt, amberCutoff),
      ),
    )
}
