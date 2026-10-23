import type { PgTable } from "drizzle-orm/pg-core"

import {
  agents,
  buyerOffers,
  buyerRequirement,
  buyerStatus,
  contactCategories,
  entityBuyerRequirements,
  entityBuyerStatuses,
  entityCategories,
  entityMembers,
  entities as entitiesTable,
  eventTimelines,
  events,
  leadSources,
  pandaAddressTypeConversions,
  pandaProperties,
  pandaPropertyTypes,
  pandaSuburbs,
  propertyEntities,
  propertyEntityFiles,
  propertyEntityNotes,
  propertyForms,
  propertyFormSends,
  propertyStatus,
} from "../../db/schema"

import type { AdminEntitySlug } from "./admin-entities-bundled"

export const adminEntityTables = {
  agents,
  "buyer-status": buyerStatus,
  "buyer-offers": buyerOffers,
  "buyer-requirement": buyerRequirement,
  "contact-categories": contactCategories,
  contacts: entitiesTable,
  entities: entitiesTable,
  "entity-buyer-requirements": entityBuyerRequirements,
  "entity-buyer-statuses": entityBuyerStatuses,
  "entity-categories": entityCategories,
  "entity-members": entityMembers,
  "event-timelines": eventTimelines,
  events,
  "lead-sources": leadSources,
  properties: pandaProperties,
  "property-types": pandaPropertyTypes,
  suburbs: pandaSuburbs,
  "property-entity-files": propertyEntityFiles,
  "property-entity-notes": propertyEntityNotes,
  "property-entities": propertyEntities,
  "property-status": propertyStatus,
  "address-type-conversions": pandaAddressTypeConversions,
  "property-forms": propertyForms,
  "property-form-sends": propertyFormSends,
} as const satisfies Record<AdminEntitySlug, PgTable>

export type AdminEntityPgTable = (typeof adminEntityTables)[AdminEntitySlug]

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type _AssertTableKeysMatchRegistry = Equal<keyof typeof adminEntityTables, AdminEntitySlug>
const _adminEntityTableKeysAligned: _AssertTableKeysMatchRegistry = true
void _adminEntityTableKeysAligned
