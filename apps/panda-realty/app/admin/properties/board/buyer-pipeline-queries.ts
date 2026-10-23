import "server-only"

import { and, asc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/db"
import { entities, pandaProperties, propertyEntities, propertyStatus } from "@/db/schema"

export type MergedBuyerCard = {
  entityId: number
  entityName: string
  buyerPipelineStatusId: number
  /** Total property_entity count for this buyer across ALL stages (for the ×N badge). */
  totalPropertyCount: number
  /** Oldest createdAt across properties — used by the calendar month filter. */
  createdAt: Date | null
  properties: Array<{
    propertyEntityId: number
    propertyListId: number
    streetAddress: string
    suburb: string
    updatedAt: Date | null
    createdAt: Date | null
  }>
}

/**
 * Returns buyer cards for the Buyers pipeline board.
 * Buyers with multiple properties in the same stage are merged into one card.
 * Returns Map<buyerPipelineStatusId, MergedBuyerCard[]>
 */
export async function fetchBuyerCardsForPipeline(): Promise<Map<number, MergedBuyerCard[]>> {
  const enquiryStage = await db
    .select({ propertyStatusId: propertyStatus.propertyStatusId })
    .from(propertyStatus)
    .where(eq(propertyStatus.pipeline, "buyers"))
    .orderBy(asc(propertyStatus.sortOrder), asc(propertyStatus.propertyStatusId))
    .limit(1)
  const enquiryStatusId = enquiryStage[0]?.propertyStatusId

  const rows = await db
    .select({
      propertyEntityId: propertyEntities.propertyEntityId,
      entityId: propertyEntities.entityId,
      entityName: entities.entityName,
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      buyerPipelineStatusId: propertyEntities.buyerPipelineStatusId,
      updatedAt: propertyEntities.updatedAt,
      createdAt: propertyEntities.createdAt,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .innerJoin(pandaProperties, eq(propertyEntities.propertyListId, pandaProperties.propertyListId))
    .where(eq(entities.entityCategoryId, 1))
    .orderBy(asc(propertyEntities.propertyEntityId))

  if (rows.length === 0) return new Map()

  // Fetch total property count per entityId across ALL stages for the ×N badge
  const entityIds = [...new Set(rows.map((r) => r.entityId))]
  const countRows = await db
    .select({
      entityId: propertyEntities.entityId,
      count: sql<number>`count(*)::int`,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(and(inArray(propertyEntities.entityId, entityIds), eq(entities.entityCategoryId, 1)))
    .groupBy(propertyEntities.entityId)

  const totalCountMap = new Map<number, number>()
  for (const r of countRows) totalCountMap.set(r.entityId, r.count)

  // Group rows by (entityId, bucketStageId) → one MergedBuyerCard per group
  const groupMap = new Map<string, MergedBuyerCard>()
  for (const row of rows) {
    const bucketId = row.buyerPipelineStatusId ?? enquiryStatusId
    if (bucketId == null) continue
    const key = `${row.entityId}-${bucketId}`
    const existing = groupMap.get(key)
    const prop = {
      propertyEntityId: row.propertyEntityId,
      propertyListId: row.propertyListId,
      streetAddress: row.streetAddress,
      suburb: row.suburb,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    }
    if (existing) {
      existing.properties.push(prop)
    } else {
      groupMap.set(key, {
        entityId: row.entityId,
        entityName: row.entityName,
        buyerPipelineStatusId: bucketId,
        totalPropertyCount: totalCountMap.get(row.entityId) ?? 1,
        createdAt: row.createdAt,
        properties: [prop],
      })
    }
  }

  const result = new Map<number, MergedBuyerCard[]>()
  for (const card of groupMap.values()) {
    const bucket = result.get(card.buyerPipelineStatusId) ?? []
    bucket.push(card)
    result.set(card.buyerPipelineStatusId, bucket)
  }
  return result
}
