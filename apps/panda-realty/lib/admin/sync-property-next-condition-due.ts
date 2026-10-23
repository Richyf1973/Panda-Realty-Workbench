import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, pandaProperties, propertyEntities } from "@/db/schema"
import { acceptedOfferDueDateSource, buildDueDateCandidates } from "./property-due-date-candidates"
import { computeNextConditionDue } from "./next-condition-due"

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Recompute and persist `panda_properties.next_condition_due` for one property.
 *
 * The value is the earliest *uncleared* condition candidate (see {@link computeNextConditionDue}),
 * built from the property's contract/settlement dates plus the accepted offer's condition-day
 * offsets and custom conditions — offer-first settlement, property fallback (mirrors
 * `panda-properties-list-enrichment.ts`). It drives the properties list's default ordering.
 *
 * Writes `null` when there is no live condition (so the property sorts to the bottom group). Call
 * this from every write path that changes the candidate dates or the clear instant: offer accept,
 * offer edit, contract/settlement edit, and due-highlight clear/unclear. It is NOT time-dependent,
 * so no scheduled recompute is needed.
 */
export async function syncPropertyNextConditionDue(
  client: DbOrTx,
  propertyListId: number,
): Promise<void> {
  const [prop] = await client
    .select({
      contractDate: pandaProperties.contractDate,
      disclosureDate: pandaProperties.disclosureDate,
      settlementDate: pandaProperties.settlementDate,
      clearedAt: pandaProperties.dueHighlightClearedAt,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!prop) return

  const [offer] = await client
    .select({
      noConditions: buyerOffers.noConditions,
      coolingOffDays: buyerOffers.coolingOffDays,
      financeDays: buyerOffers.financeDays,
      buildingPestDays: buyerOffers.buildingPestDays,
      dueDiligenceDays: buyerOffers.dueDiligenceDays,
      saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
      unconditionalContractDays: buyerOffers.unconditionalContractDays,
      subjectToSaleDays: buyerOffers.subjectToSaleDays,
      customConditions: buyerOffers.customConditions,
      settlementDate: buyerOffers.settlementDate,
    })
    .from(buyerOffers)
    .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
    .where(and(eq(propertyEntities.propertyListId, propertyListId), eq(buyerOffers.isAccepted, true)))
    .limit(1)

  const candidates = buildDueDateCandidates(acceptedOfferDueDateSource(prop, offer))

  const nextConditionDue = computeNextConditionDue({ candidates, clearedAt: prop.clearedAt })

  await client
    .update(pandaProperties)
    .set({ nextConditionDue })
    .where(eq(pandaProperties.propertyListId, propertyListId))
}

/** Resolve the property for an accepted-offer's `propertyEntityId` and recompute its next condition due. */
export async function syncPropertyNextConditionDueForPropertyEntity(
  client: DbOrTx,
  propertyEntityId: number,
): Promise<void> {
  const [row] = await client
    .select({ propertyListId: propertyEntities.propertyListId })
    .from(propertyEntities)
    .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
    .limit(1)

  if (!row || row.propertyListId == null) return
  await syncPropertyNextConditionDue(client, row.propertyListId)
}
