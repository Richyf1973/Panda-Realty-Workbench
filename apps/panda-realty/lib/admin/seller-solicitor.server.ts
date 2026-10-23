import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { entities, propertyEntities } from "@/db/schema"

import { CONTACT_CATEGORY_SOLICITOR, ENTITY_CATEGORY_CONTACT } from "./entity-category-ids"

/** `entities.association` value that tags a contact as belonging to the seller side. */
export const SELLER_ASSOCIATION = "Seller"

export type SellerSolicitorContact = {
  entityName: string | null
  contact: string | null
  address: string | null
  emailAddress: string | null
}

/**
 * The seller's solicitor for a property: the Contact entity linked to the property whose contact
 * category is Solicitor AND whose `association` is "Seller" (citext, so case-insensitive).
 *
 * Returns null when none is tagged for the seller. Callers must NOT fall back to another solicitor —
 * a property can hold both the buyer's and the seller's solicitor under the same Solicitor category,
 * so an unfiltered pick can surface the buyer's solicitor in the seller's slot.
 */
export async function fetchSellerSolicitorContact(
  propertyListId: number,
): Promise<SellerSolicitorContact | null> {
  const [row] = await db
    .select({
      entityName: entities.entityName,
      contact: entities.contact,
      address: entities.address,
      emailAddress: entities.emailAddress,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(
      and(
        eq(propertyEntities.propertyListId, propertyListId),
        eq(entities.entityCategoryId, ENTITY_CATEGORY_CONTACT),
        eq(entities.contactCategoryId, CONTACT_CATEGORY_SOLICITOR),
        eq(entities.association, SELLER_ASSOCIATION),
      ),
    )
    .limit(1)

  return row ?? null
}
