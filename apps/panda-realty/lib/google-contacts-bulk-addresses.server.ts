import "server-only"

import { and, eq, inArray, or, sql } from "drizzle-orm"

import { db } from "@/db"
import { isDialablePhone } from "@/lib/google-contact-dialable"
import { entities, entityCategories, entityMembers, pandaProperties, propertyEntities } from "@/db/schema"

export type BulkGoogleContactsFetchOptions = {
  /**
   * When set (dev hatch from `getGoogleContactsPatchAllRecentFilter`), only rows where the
   * property–entity link, entity, or listing was updated/created on or after this instant.
   */
  recentActivitySince?: Date | null
  /**
   * Dev-only (`getGoogleContactsPatchAllPropertyListAllowlist`): restrict to these
   * **`property_list_id`** values (combined with **`recentActivitySince`** when both are set).
   */
  propertyListIds?: readonly number[] | null
}

/** Property-linked rows for bulk Google Contacts sync. */
export async function fetchEntitiesWithPropertyStreetsForBulkSync(
  options?: BulkGoogleContactsFetchOptions,
) {
  const recent = options?.recentActivitySince ?? null
  const reachable = or(
    sql`coalesce(trim(${entities.emailAddress}::text), '') <> ''`,
    sql`coalesce(trim(${entities.contact}::text), '') <> ''`,
  )
  /** postgres.js / Drizzle `sql` here expects string params for timestamps, not `Date` instances. */
  const cutoffIso = recent ? recent.toISOString() : null
  const recentActivity =
    recent && cutoffIso
      ? sql`(
        coalesce(${propertyEntities.updatedAt}, ${propertyEntities.createdAt}) >= ${cutoffIso}::timestamptz
        OR coalesce(${entities.updatedAt}, ${entities.createdAt}) >= ${cutoffIso}::timestamptz
        OR coalesce(${pandaProperties.updatedAt}, ${pandaProperties.createdAt}) >= ${cutoffIso}::timestamptz
      )`
      : null

  const listingIds = options?.propertyListIds?.length ? [...options.propertyListIds] : null
  const listingFilter =
    listingIds != null ? inArray(propertyEntities.propertyListId, listingIds) : null

  const entityWhereParts = [reachable, recentActivity, listingFilter].filter(
    (x): x is NonNullable<typeof x> => x != null,
  )
  const entityWhere =
    entityWhereParts.length === 1 ? entityWhereParts[0]! : and(...entityWhereParts)

  return db
    .select({
      entityId: entities.entityId,
      entityName: entities.entityName,
      emailAddress: entities.emailAddress,
      contact: entities.contact,
      streetAddress: pandaProperties.streetAddress,
      entityCategorySlug: entityCategories.slug,
    })
    .from(entities)
    .innerJoin(entityCategories, eq(entities.entityCategoryId, entityCategories.entityCategoryId))
    .innerJoin(propertyEntities, eq(propertyEntities.entityId, entities.entityId))
    .innerJoin(
      pandaProperties,
      eq(pandaProperties.propertyListId, propertyEntities.propertyListId),
    )
    .where(entityWhere)
}

export type EntityMemberBulkRow = {
  entityMemberId: number
  /** Parent entity ID — used for audit `contributingEntityIds`. */
  entityId: number
  /** Parent entity name — used in display name suffix. */
  entityName: string
  /** Parent entity category slug — used for member naming rules. */
  entityCategorySlug: string
  memberName: string
  memberEmailAddress?: string
  /** Already verified dialable. */
  memberPhoneNumber?: string
  isBuyersRepresentative: boolean
  streetAddress?: string
}

/** All entity members with email or dialable phone — for bulk Google Contacts sync. */
export async function fetchEntityMembersForBulkSync(
  options?: BulkGoogleContactsFetchOptions,
): Promise<EntityMemberBulkRow[]> {
  const recent = options?.recentActivitySince ?? null
  const cutoffIso = recent ? recent.toISOString() : null
  const recentActivity =
    recent && cutoffIso
      ? sql`coalesce(${entityMembers.updatedAt}, ${entityMembers.createdAt}) >= ${cutoffIso}::timestamptz`
      : null

  const listingIds = options?.propertyListIds?.length ? [...options.propertyListIds] : null
  const listingFilter =
    listingIds != null ? inArray(propertyEntities.propertyListId, listingIds) : null

  const reachable = or(
    sql`coalesce(trim(${entityMembers.memberEmailAddress}::text), '') <> ''`,
    sql`coalesce(trim(${entityMembers.memberPhoneNumber}::text), '') <> ''`,
  )

  const whereParts = [reachable, recentActivity, listingFilter].filter(
    (x): x is NonNullable<typeof x> => x != null,
  )
  const where = whereParts.length === 1 ? whereParts[0]! : and(...whereParts)

  const rows = await db
    .select({
      entityMemberId: entityMembers.entityMemberId,
      entityId: entities.entityId,
      entityName: entities.entityName,
      entityCategorySlug: entityCategories.slug,
      memberName: entityMembers.memberName,
      memberEmailAddress: entityMembers.memberEmailAddress,
      memberPhoneNumber: entityMembers.memberPhoneNumber,
      isBuyersRepresentative: entityMembers.isBuyersRepresentative,
      streetAddress: pandaProperties.streetAddress,
    })
    .from(entityMembers)
    .innerJoin(entities, eq(entities.entityId, entityMembers.entityId))
    .innerJoin(entityCategories, eq(entities.entityCategoryId, entityCategories.entityCategoryId))
    .innerJoin(propertyEntities, eq(propertyEntities.entityId, entities.entityId))
    .innerJoin(pandaProperties, eq(pandaProperties.propertyListId, propertyEntities.propertyListId))
    .where(where)

  const out: EntityMemberBulkRow[] = []
  for (const r of rows) {
    const emailRaw = typeof r.memberEmailAddress === "string" ? r.memberEmailAddress.trim() : ""
    const phoneRaw = typeof r.memberPhoneNumber === "string" ? r.memberPhoneNumber.trim() : ""
    const dialablePhone = phoneRaw.length > 0 && isDialablePhone(phoneRaw) ? phoneRaw : undefined
    if (!emailRaw && !dialablePhone) continue
    out.push({
      entityMemberId: r.entityMemberId,
      entityId: r.entityId,
      entityName: typeof r.entityName === "string" && r.entityName.trim() ? r.entityName.trim() : "Contact",
      entityCategorySlug: String(r.entityCategorySlug ?? "").trim(),
      memberName: typeof r.memberName === "string" && r.memberName.trim() ? r.memberName.trim() : "Member",
      memberEmailAddress: emailRaw.length > 0 ? emailRaw : undefined,
      memberPhoneNumber: dialablePhone,
      isBuyersRepresentative: r.isBuyersRepresentative,
      streetAddress: typeof r.streetAddress === "string" && r.streetAddress.trim() ? r.streetAddress.trim() : undefined,
    })
  }
  return out
}

function trimNonempty(s: unknown): string | null {
  if (typeof s !== "string") return null
  const t = s.trim()
  return t.length > 0 ? t : null
}

export type OwnerSlotBulkRow = {
  propertyListId: number
  slot: 1 | 2 | 3
  entityName: string
  streetAddress?: string
  emailAddress?: string
  dialableOwnerPhone?: string
}

const ownerReachableClause = sql`(
    coalesce(trim(${pandaProperties.owner1email}::text), '') <> ''
    OR coalesce(trim(${pandaProperties.owner2email}::text), '') <> ''
    OR coalesce(trim(${pandaProperties.owner3email}::text), '') <> ''
    OR coalesce(trim(${pandaProperties.owner1phone}::text), '') <> ''
    OR coalesce(trim(${pandaProperties.owner2phone}::text), '') <> ''
    OR coalesce(trim(${pandaProperties.owner3phone}::text), '') <> ''
  )`

/** One row per owner slot (1–3) with email and/or dialable owner phone — for bulk Google Contacts merge. */
export async function fetchOwnerSlotsForBulkGoogleContactsSync(
  options?: BulkGoogleContactsFetchOptions,
): Promise<OwnerSlotBulkRow[]> {
  const recent = options?.recentActivitySince ?? null
  const recentListing = recent
    ? sql`coalesce(${pandaProperties.updatedAt}, ${pandaProperties.createdAt}) >= ${recent.toISOString()}::timestamptz`
    : null

  const listingIds = options?.propertyListIds?.length ? [...options.propertyListIds] : null
  const listingFilter =
    listingIds != null ? inArray(pandaProperties.propertyListId, listingIds) : null

  const ownerWhereParts = [ownerReachableClause, recentListing, listingFilter].filter(
    (x): x is NonNullable<typeof x> => x != null,
  )
  const ownerWhere =
    ownerWhereParts.length === 1 ? ownerWhereParts[0]! : and(...ownerWhereParts)

  const rows = await db
    .select({
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      owner1name: pandaProperties.owner1name,
      owner1phone: pandaProperties.owner1phone,
      owner1email: pandaProperties.owner1email,
      owner2name: pandaProperties.owner2name,
      owner2phone: pandaProperties.owner2phone,
      owner2email: pandaProperties.owner2email,
      owner3name: pandaProperties.owner3name,
      owner3phone: pandaProperties.owner3phone,
      owner3email: pandaProperties.owner3email,
    })
    .from(pandaProperties)
    .where(ownerWhere)

  const out: OwnerSlotBulkRow[] = []
  for (const r of rows) {
    const streetRaw = r.streetAddress
    const street =
      typeof streetRaw === "string" && streetRaw.trim().length > 0 ? streetRaw.trim() : undefined

    const slots = [
      { n: 1 as const, name: r.owner1name, phone: r.owner1phone, email: r.owner1email },
      { n: 2 as const, name: r.owner2name, phone: r.owner2phone, email: r.owner2email },
      { n: 3 as const, name: r.owner3name, phone: r.owner3phone, email: r.owner3email },
    ]
    for (const { n, name, phone, email } of slots) {
      const emailAddress = trimNonempty(email)
      const phoneStr = typeof phone === "string" ? phone.trim() : ""
      const dialableOwnerPhone =
        phoneStr.length > 0 && isDialablePhone(phoneStr) ? phoneStr : undefined
      if (!emailAddress && !dialableOwnerPhone) continue
      const nameRaw = name
      const entityName =
        typeof nameRaw === "string" && nameRaw.trim().length > 0 ? nameRaw.trim() : `Owner ${n}`
      const plid =
        typeof r.propertyListId === "number" && Number.isFinite(r.propertyListId)
          ? r.propertyListId
          : Number(r.propertyListId)
      if (!Number.isFinite(plid) || plid <= 0) continue
      out.push({
        propertyListId: plid,
        slot: n,
        entityName,
        emailAddress: emailAddress ?? undefined,
        dialableOwnerPhone,
        streetAddress: street,
      })
    }
  }
  return out
}
