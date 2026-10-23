import "server-only"

import { and, count, eq, inArray, ne } from "drizzle-orm"
import type { AdminEntityQueryServerContext } from "@repo/admin/admin-entity-types"

import { db } from "@/db"
import { buyerOffers, entities, entityBuyerStatuses, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import {
  parsePropertyEntitiesPayload,
  syncPropertyEntitiesSubsetInTx,
  type PropertyEntitiesDbTx,
} from "@/lib/admin/property-entities-sync.server"
import {
  maybeAdvanceBuyerPipelineOnOfferInTx,
  parseBuyerOffersWorkspacePayload,
  parseEntityMembersWorkspacePayload,
  parsePropertyEntityNotesPayload,
  syncBuyerOffersForPropertyEntityInTx,
  syncEntityMembersForEntityInTx,
  syncPropertyEntityNotesInTx,
  type PropertyEntityWorkspaceDbTx,
} from "@/lib/admin/property-entity-workspace-sync.server"

// Entity category IDs from panda_realty.entity_categories (stable lookup data)
// buyer=1, seller=2, tenant=3, contact=4
const CATEGORY_SELLER = 2
const CATEGORY_BUYER = 1
const CATEGORY_TENANT = 3
const CATEGORY_CONTACT = 4

type DbTx = PropertyEntitiesDbTx

async function applyPropertyEntityWorkspaceExtras(
  tx: PropertyEntityWorkspaceDbTx,
  propertyEntityId: number,
  propertyListId: number,
  entityId: number,
  extras: Record<string, unknown>,
  createdByEmail: string | null,
): Promise<void> {
  if (Object.hasOwn(extras, "entityMembers")) {
    const lines = parseEntityMembersWorkspacePayload(extras.entityMembers)
    await syncEntityMembersForEntityInTx(tx, entityId, lines)
  }
  if (Object.hasOwn(extras, "buyerOffers")) {
    const lines = parseBuyerOffersWorkspacePayload(extras.buyerOffers)
    const incomingHasAccepted = lines.some((l) => l.isAccepted === true)
    if (incomingHasAccepted) {
      const conflicts = await tx
        .select({ count: count() })
        .from(buyerOffers)
        .innerJoin(
          propertyEntities,
          eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId),
        )
        .where(
          and(
            eq(propertyEntities.propertyListId, propertyListId),
            ne(propertyEntities.propertyEntityId, propertyEntityId),
            eq(buyerOffers.isAccepted, true),
          ),
        )
      if (Number(conflicts[0]?.count ?? 0) > 0) {
        throw new Error(
          "[VALIDATION] Only one accepted offer is allowed per property.",
        )
      }
    }
    await syncBuyerOffersForPropertyEntityInTx(tx, propertyEntityId, lines)
    await maybeAdvanceBuyerPipelineOnOfferInTx(tx, propertyEntityId, lines)
  }
  if (Object.hasOwn(extras, "propertyEntityNotes")) {
    const lines = parsePropertyEntityNotesPayload(extras.propertyEntityNotes)
    await syncPropertyEntityNotesInTx(tx, propertyEntityId, lines, createdByEmail)
  }
}

/**
 * Given a propertyListId and a category id, return the propertyEntityIds
 * that belong to entities of that category — used to scope deletions per subset.
 */
async function fetchExistingIdsByCategory(
  tx: DbTx,
  propertyListId: number,
  categoryId: number,
): Promise<number[]> {
  const rows = await tx
    .select({ propertyEntityId: propertyEntities.propertyEntityId })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(
      and(
        eq(propertyEntities.propertyListId, propertyListId),
        eq(entities.entityCategoryId, categoryId),
      ),
    )
  return rows.map((r) => r.propertyEntityId)
}

async function applyCategorySync(
  tx: DbTx,
  slug: string,
  propertyListId: number,
  extras: Record<string, unknown>,
) {
  if (slug !== "properties") return

  const categoryMap: Array<{ key: string; categoryId: number }> = [
    { key: "propertyBuyers", categoryId: CATEGORY_BUYER },
    { key: "propertyContacts", categoryId: CATEGORY_CONTACT },
    { key: "propertyTenants", categoryId: CATEGORY_TENANT },
  ]

  for (const { key, categoryId } of categoryMap) {
    if (!Object.hasOwn(extras, key)) continue
    const lines = parsePropertyEntitiesPayload(extras[key])
    const existingIds = await fetchExistingIdsByCategory(
      tx,
      propertyListId,
      categoryId,
    )
    await syncPropertyEntitiesSubsetInTx(tx, propertyListId, lines, existingIds)
  }
}

async function syncEntityBuyerStatuses(
  tx: DbTx,
  entityId: number,
  entityBuyerStatusesList: unknown,
) {
  if (!Array.isArray(entityBuyerStatusesList)) return

  // Extract buyer_status_id values from the list of rows
  const buyerStatusIds = entityBuyerStatusesList
    .map((item) => {
      if (typeof item === "object" && item !== null) {
        const row = item as Record<string, unknown>
        const id = row.buyerStatusId
        return typeof id === "number" ? id : null
      }
      return null
    })
    .filter((id): id is number => id !== null)

  // Delete all existing entity buyer status assignments for this entity
  await tx.delete(entityBuyerStatuses).where(eq(entityBuyerStatuses.entityId, entityId))

  // Insert the new assignments
  if (buyerStatusIds.length > 0) {
    await tx.insert(entityBuyerStatuses).values(
      buyerStatusIds.map((buyerStatusId) => ({
        entityId,
        buyerStatusId,
      })),
    )
  }
}

export const adminEntityQueryExtrasHandlers: Pick<
  AdminEntityQueryServerContext,
  "applyCreateExtrasInTransaction" | "applyPatchExtrasInTransaction"
> = {
  applyCreateExtrasInTransaction: async ({
    tx,
    slug,
    insertedParentRow,
    extras,
  }) => {
    const dtx = tx as DbTx

    if (slug === "properties") {
      const propertyListId = Number(insertedParentRow.propertyListId)
      await applyCategorySync(dtx, slug, propertyListId, extras)
    } else if (slug === "entities") {
      const entityId = Number(insertedParentRow.entityId)
      if (Object.hasOwn(extras, "entityBuyerStatuses")) {
        await syncEntityBuyerStatuses(dtx, entityId, extras.entityBuyerStatuses)
      }
    } else if (slug === "property-entities") {
      const wtx = tx as PropertyEntityWorkspaceDbTx
      const propertyEntityId = Number(insertedParentRow.propertyEntityId)
      const propertyListId = Number(insertedParentRow.propertyListId)
      const entityId = Number(insertedParentRow.entityId)
      if (
        !Number.isFinite(propertyEntityId) ||
        !Number.isFinite(propertyListId) ||
        !Number.isFinite(entityId)
      ) return
      const user = await getSessionUser()
      await applyPropertyEntityWorkspaceExtras(
        wtx,
        propertyEntityId,
        propertyListId,
        entityId,
        extras,
        user?.email ?? null,
      )
    }
  },

  applyPatchExtrasInTransaction: async ({
    tx,
    slug,
    idParam,
    extras,
    updatedParentRow,
  }) => {
    const dtx = tx as DbTx

    if (slug === "properties") {
      const propertyListId = Number(idParam)
      await applyCategorySync(dtx, slug, propertyListId, extras)
    } else if (slug === "entities") {
      const entityId = Number(idParam)
      if (Object.hasOwn(extras, "entityBuyerStatuses")) {
        await syncEntityBuyerStatuses(dtx, entityId, extras.entityBuyerStatuses)
      }
    } else if (slug === "property-entities") {
      const wtx = tx as PropertyEntityWorkspaceDbTx
      const propertyEntityId = Number(idParam)
      const propertyListId = Number(updatedParentRow.propertyListId)
      const entityId = Number(updatedParentRow.entityId)
      if (
        !Number.isFinite(propertyEntityId) ||
        !Number.isFinite(propertyListId) ||
        !Number.isFinite(entityId)
      ) return
      const user = await getSessionUser()
      await applyPropertyEntityWorkspaceExtras(
        wtx,
        propertyEntityId,
        propertyListId,
        entityId,
        extras,
        user?.email ?? null,
      )
    }
  },
}
