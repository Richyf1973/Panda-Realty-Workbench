import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, pandaProperties, propertyEntities } from "@/db/schema"
import type { ConditionOfferFields } from "../properties/board/compute-condition-events"

export type CalendarProperty = {
  propertyListId: number
  streetAddress: string
  suburb: string
  contractDate: Date | null
  disclosureDate: Date | null
  /** When the due-date highlight was last cleared; condition events at/before this stay un-highlighted. */
  dueHighlightClearedAt: Date | null
  acceptedOffer: ConditionOfferFields | null
}

export async function fetchFavoritePropertiesWithConditions(): Promise<CalendarProperty[]> {
  const properties = await db
    .select({
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      contractDate: pandaProperties.contractDate,
      disclosureDate: pandaProperties.disclosureDate,
      dueHighlightClearedAt: pandaProperties.dueHighlightClearedAt,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.isFavorite, true))
    .orderBy(pandaProperties.propertyListId)

  if (properties.length === 0) return []

  const propertyIds = properties.map((p) => p.propertyListId)

  const offerRows = await db
    .select({
      propertyListId: propertyEntities.propertyListId,
      noConditions: buyerOffers.noConditions,
      isCashOffer: buyerOffers.isCashOffer,
      coolingOffDays: buyerOffers.coolingOffDays,
      financeDays: buyerOffers.financeDays,
      buildingPestDays: buyerOffers.buildingPestDays,
      dueDiligenceDays: buyerOffers.dueDiligenceDays,
      subjectToSaleDays: buyerOffers.subjectToSaleDays,
      saleOfPropertyDays: buyerOffers.saleOfPropertyDays,
      unconditionalContractDays: buyerOffers.unconditionalContractDays,
    })
    .from(buyerOffers)
    .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
    .where(
      and(
        inArray(propertyEntities.propertyListId, propertyIds),
        eq(buyerOffers.isAccepted, true),
      ),
    )

  const offerByProperty = new Map<number, ConditionOfferFields>()
  for (const row of offerRows) {
    if (row.propertyListId != null && !offerByProperty.has(row.propertyListId)) {
      offerByProperty.set(row.propertyListId, {
        noConditions: row.noConditions,
        isCashOffer: row.isCashOffer,
        coolingOffDays: row.coolingOffDays,
        financeDays: row.financeDays,
        buildingPestDays: row.buildingPestDays,
        dueDiligenceDays: row.dueDiligenceDays,
        subjectToSaleDays: row.subjectToSaleDays,
        saleOfPropertyDays: row.saleOfPropertyDays,
        unconditionalContractDays: row.unconditionalContractDays,
      })
    }
  }

  return properties.map((p) => ({
    ...p,
    acceptedOffer: offerByProperty.get(p.propertyListId) ?? null,
  }))
}
