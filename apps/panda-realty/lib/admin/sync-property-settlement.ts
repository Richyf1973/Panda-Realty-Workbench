import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, pandaProperties, propertyEntities } from "@/db/schema"

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Mirror the accepted offer's settlement date onto the property row.
 *
 * The accepted offer (`buyer_offers.settlement_date`) is the source of truth for settlement; this
 * keeps `panda_properties.settlement_date` in sync so the calendar, exports, and the property
 * summary read the contract settlement rather than a stale RP-import value.
 *
 * Policy ("overwrite where the offer has a date"): only writes when the accepted offer has a
 * non-null settlement date — it never clears an existing property value.
 */
export async function syncPropertySettlementFromAcceptedOffer(
  client: DbOrTx,
  propertyEntityId: number,
): Promise<void> {
  const [row] = await client
    .select({
      propertyListId: propertyEntities.propertyListId,
      settlementDate: buyerOffers.settlementDate,
    })
    .from(buyerOffers)
    .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
    .where(
      and(
        eq(buyerOffers.propertyEntityId, propertyEntityId),
        eq(buyerOffers.isAccepted, true),
      ),
    )
    .limit(1)

  if (!row || row.propertyListId == null || row.settlementDate == null) return

  await client
    .update(pandaProperties)
    .set({ settlementDate: new Date(row.settlementDate) })
    .where(eq(pandaProperties.propertyListId, row.propertyListId))
}
