import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { isDialablePhone } from "@/lib/google-contact-dialable"
import { resolveEntityPhoneForGoogleSync } from "@/lib/google-contact-entity-phone"
import { entities, entityCategories, entityMembers, pandaProperties, propertyEntities } from "@/db/schema"

/** All entity IDs linked to a property (buyers, contacts, tenants) for Google sync. */
export async function fetchLinkedEntityIdsForPropertySync(propertyListId: number): Promise<number[]> {
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) return []
  const rows = await db
    .select({ entityId: propertyEntities.entityId })
    .from(propertyEntities)
    .where(eq(propertyEntities.propertyListId, propertyListId))
  return rows
    .map((r) => r.entityId)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0)
}

/**
 * All `street_address` values for properties linked to this entity (inner join only — skips orphan links).
 */
export async function fetchStreetAddressesForEntity(entityId: number): Promise<string[]> {
  if (!Number.isFinite(entityId) || entityId <= 0) return []
  const rows = await db
    .select({ street: pandaProperties.streetAddress })
    .from(propertyEntities)
    .innerJoin(
      pandaProperties,
      eq(pandaProperties.propertyListId, propertyEntities.propertyListId),
    )
    .where(
      eq(propertyEntities.entityId, entityId),
    )
  return rows
    .map((r) => (typeof r.street === "string" ? r.street.trim() : ""))
    .filter((s) => s.length > 0)
}

export type EntityMemberGoogleSyncRow = {
  entityMemberId: number
  memberName: string
  memberEmailAddress?: string
  memberPhoneNumber?: string
  isBuyersRepresentative: boolean
  parentEntityCategorySlug: string
}

export async function loadEntityMembersForGoogleSync(entityId: number): Promise<EntityMemberGoogleSyncRow[]> {
  if (!Number.isFinite(entityId) || entityId <= 0) return []
  const rows = await db
    .select({
      entityMemberId: entityMembers.entityMemberId,
      memberName: entityMembers.memberName,
      memberEmailAddress: entityMembers.memberEmailAddress,
      memberPhoneNumber: entityMembers.memberPhoneNumber,
      isBuyersRepresentative: entityMembers.isBuyersRepresentative,
      parentEntityCategorySlug: entityCategories.slug,
    })
    .from(entityMembers)
    .innerJoin(entities, eq(entities.entityId, entityMembers.entityId))
    .innerJoin(entityCategories, eq(entities.entityCategoryId, entityCategories.entityCategoryId))
    .where(eq(entityMembers.entityId, entityId))

  const out: EntityMemberGoogleSyncRow[] = []
  for (const r of rows) {
    const name = typeof r.memberName === "string" ? r.memberName.trim() : ""
    if (!name) continue
    const emailRaw = typeof r.memberEmailAddress === "string" ? r.memberEmailAddress.trim() : ""
    const phoneRaw = typeof r.memberPhoneNumber === "string" ? r.memberPhoneNumber.trim() : ""
    const dialablePhone = phoneRaw.length > 0 && isDialablePhone(phoneRaw) ? phoneRaw : undefined
    if (!emailRaw && !dialablePhone) continue
    out.push({
      entityMemberId: r.entityMemberId,
      memberName: name,
      memberEmailAddress: emailRaw.length > 0 ? emailRaw : undefined,
      memberPhoneNumber: dialablePhone,
      isBuyersRepresentative: r.isBuyersRepresentative,
      parentEntityCategorySlug:
        typeof r.parentEntityCategorySlug === "string" ? r.parentEntityCategorySlug.trim() : "",
    })
  }
  return out
}

export type EntityGoogleSyncRow = {
  entityId: number
  entityName: string
  emailAddress?: string
  /** Dialable value from `entities.contact` only (not `mobile`). */
  phoneNumber?: string
  /** `entity_categories.slug` for display-name prefix mapping. */
  entityCategorySlug: string
}

export async function loadEntityRowForGoogleSync(entityId: number): Promise<EntityGoogleSyncRow | null> {
  if (!Number.isFinite(entityId) || entityId <= 0) return null
  const [row] = await db
    .select({
      entityId: entities.entityId,
      entityName: entities.entityName,
      emailAddress: entities.emailAddress,
      contact: entities.contact,
      entityCategorySlug: entityCategories.slug,
    })
    .from(entities)
    .innerJoin(entityCategories, eq(entities.entityCategoryId, entityCategories.entityCategoryId))
    .where(eq(entities.entityId, entityId))
    .limit(1)
  if (!row) return null
  const email = typeof row.emailAddress === "string" ? row.emailAddress.trim() : ""

  let phone = resolveEntityPhoneForGoogleSync(row.contact)
  if (!phone) {
    const memberRows = await db
      .select({ memberPhoneNumber: entityMembers.memberPhoneNumber })
      .from(entityMembers)
      .where(eq(entityMembers.entityId, entityId))
      .limit(5)
    phone = resolveEntityPhoneForGoogleSync(null, memberRows.map((m) => m.memberPhoneNumber))
  }

  if (!email && !phone) return null
  return {
    entityId: row.entityId,
    entityName: typeof row.entityName === "string" ? row.entityName.trim() : "Contact",
    emailAddress: email.length > 0 ? email : undefined,
    phoneNumber: phone,
    entityCategorySlug:
      typeof row.entityCategorySlug === "string" ? row.entityCategorySlug.trim() : "",
  }
}
