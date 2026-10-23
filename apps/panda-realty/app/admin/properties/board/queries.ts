import "server-only"

import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/db"
import { buyerOffers, entities, pandaProperties, propertyEntities, propertyStatus } from "@/db/schema"
import { fetchDueHighlightByPropertyListId } from "@/app/api/admin/properties/panda-properties-list-enrichment"
import type { DueWarningTier } from "@/lib/admin/due-highlight"

export type PipelineStage = {
  propertyStatusId: number
  propertyStatusCode: string
  propertyStatus: string | null
  pipeline: string | null
  sortOrder: number | null
}

export type PropertyCardBuyer = {
  propertyEntityId: number
  entityName: string
  offers: Array<{
    buyerOfferId: number
    offer: string
    dateOffered: string
    isAccepted: boolean
  }>
}

export type PropertyCard = {
  propertyListId: number
  streetAddress: string
  suburb: string
  salePrice: string | null
  appraisedAmount: string | null
  updatedAt: Date | null
  propertyStatusId: number | null
  buyers: PropertyCardBuyer[]
  dueHighlightActive: boolean
  dueHighlightLabels: string[]
  dueWarningActive: boolean
  dueWarningLabels: string[]
  dueWarningTier: DueWarningTier | null
}

export async function fetchPipelineStages(
  pipeline: "sellers" | "buyers",
): Promise<PipelineStage[]> {
  return db
    .select({
      propertyStatusId: propertyStatus.propertyStatusId,
      propertyStatusCode: propertyStatus.propertyStatusCode,
      propertyStatus: propertyStatus.propertyStatus,
      pipeline: propertyStatus.pipeline,
      sortOrder: propertyStatus.sortOrder,
    })
    .from(propertyStatus)
    .where(eq(propertyStatus.pipeline, pipeline))
    .orderBy(asc(propertyStatus.sortOrder), asc(propertyStatus.propertyStatusId))
}

export async function fetchFavoritePropertiesForPipeline(
  pipeline: "sellers" | "buyers",
): Promise<Map<number, PropertyCard[]>> {
  const stages = await db
    .select({ propertyStatusId: propertyStatus.propertyStatusId })
    .from(propertyStatus)
    .where(eq(propertyStatus.pipeline, pipeline))

  if (stages.length === 0) return new Map()

  const statusIds = stages.map((s) => s.propertyStatusId)

  const rows = await db
    .select({
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      salePrice: pandaProperties.salePrice,
      appraisedAmount: pandaProperties.appraisedAmount,
      updatedAt: pandaProperties.updatedAt,
      propertyStatusId: pandaProperties.propertyStatusId,
    })
    .from(pandaProperties)
    .where(
      and(
        eq(pandaProperties.isFavorite, true),
        inArray(pandaProperties.propertyStatusId, statusIds),
      ),
    )
    .orderBy(desc(pandaProperties.updatedAt), desc(pandaProperties.propertyListId))

  if (rows.length === 0) return new Map()

  const propertyIds = rows.map((r) => r.propertyListId)

  // Fetch buyers, offers, and due-highlight state in parallel for all returned properties
  const [buyerRows, offerRows, dueHighlightMap] = await Promise.all([
    db
      .select({
        propertyEntityId: propertyEntities.propertyEntityId,
        propertyListId: propertyEntities.propertyListId,
        entityName: entities.entityName,
      })
      .from(propertyEntities)
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(
        and(
          inArray(propertyEntities.propertyListId, propertyIds),
          eq(entities.entityCategoryId, 1),
        ),
      )
      .orderBy(asc(propertyEntities.propertyEntityId)),

    db
      .select({
        buyerOfferId: buyerOffers.buyerOfferId,
        propertyEntityId: buyerOffers.propertyEntityId,
        offer: buyerOffers.offer,
        dateOffered: buyerOffers.dateOffered,
        isAccepted: buyerOffers.isAccepted,
      })
      .from(buyerOffers)
      .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
      .where(inArray(propertyEntities.propertyListId, propertyIds))
      .orderBy(desc(buyerOffers.offer)),

    fetchDueHighlightByPropertyListId(propertyIds),
  ])

  // Build Map<propertyEntityId, offers[]>
  const offersByBuyer = new Map<number, PropertyCardBuyer["offers"]>()
  for (const o of offerRows) {
    const bucket = offersByBuyer.get(o.propertyEntityId) ?? []
    bucket.push({
      buyerOfferId: o.buyerOfferId,
      offer: o.offer,
      dateOffered: o.dateOffered,
      isAccepted: o.isAccepted,
    })
    offersByBuyer.set(o.propertyEntityId, bucket)
  }

  // Build Map<propertyListId, PropertyCardBuyer[]>
  const buyersByProperty = new Map<number, PropertyCardBuyer[]>()
  for (const b of buyerRows) {
    if (b.propertyListId == null) continue
    const bucket = buyersByProperty.get(b.propertyListId) ?? []
    bucket.push({
      propertyEntityId: b.propertyEntityId,
      entityName: b.entityName,
      offers: offersByBuyer.get(b.propertyEntityId) ?? [],
    })
    buyersByProperty.set(b.propertyListId, bucket)
  }

  const result = new Map<number, PropertyCard[]>()
  for (const row of rows) {
    if (row.propertyStatusId == null) continue
    const bucket = result.get(row.propertyStatusId) ?? []
    const dueHighlight = dueHighlightMap.get(row.propertyListId)
    bucket.push({
      ...row,
      buyers: buyersByProperty.get(row.propertyListId) ?? [],
      dueHighlightActive: dueHighlight?.active ?? false,
      dueHighlightLabels: dueHighlight?.labels ?? [],
      dueWarningActive: dueHighlight?.warning ?? false,
      dueWarningLabels: dueHighlight?.warningLabels ?? [],
      dueWarningTier: dueHighlight?.warningTier ?? null,
    })
    result.set(row.propertyStatusId, bucket)
  }
  return result
}

