import "server-only"

import { and, asc, eq, ne, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

import {
  adminJsonError,
  isValidAdminEntityIdParam,
  parseAdminEntityPatchBody,
} from "@repo/admin/admin-api"
import {
  completeAdminEntityPatchWithMaybeExtras,
  fetchAdminEntityDetailForApi,
} from "@repo/admin/admin-entity-queries"

import { db } from "@/db"
import { entities, pandaProperties, propertyEntities } from "@/db/schema"
import { adminEntities } from "@/lib/admin/admin-entity-registry"
import { adminEntityQueryContextCore } from "@/lib/admin/admin-server-context"
import { getSessionUser } from "@/lib/auth/session"
import {
  attachGoogleContactsWarnings,
  syncEntityToGoogleContacts,
} from "@/lib/google-contacts-sync.server"

const BUYER_ENTITY_CATEGORY_ID = 1

const ENTITY = "property-entities" as const
const ctx = { ...adminEntityQueryContextCore, db }

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Fetches propertyListId and property address directly from the DB and injects them into
 * the response. propertyListId has list:false/patch:false (its listRelation JOIN onto
 * panda_properties would exceed Postgres's 100-argument limit), so the generic
 * stripAdminEntityApiRow strips it. propertyRef (address fields) is embedded here so callers
 * don't need a second fetch to /api/admin/properties/:id just for the label.
 */
async function withPropertyListIdAndRef(
  id: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const numId = Number(id)
  if (!Number.isFinite(numId) || numId <= 0) return row
  const [raw] = await db
    .select({
      propertyListId: propertyEntities.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
    })
    .from(propertyEntities)
    .leftJoin(
      pandaProperties,
      eq(pandaProperties.propertyListId, propertyEntities.propertyListId),
    )
    .where(eq(propertyEntities.propertyEntityId, numId))
    .limit(1)
  if (!raw) return row
  const propertyRef =
    raw.streetAddress != null
      ? { streetAddress: raw.streetAddress, state: raw.state, postcode: raw.postcode }
      : null
  return { ...row, propertyListId: raw.propertyListId, propertyRef }
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  if (!isValidAdminEntityIdParam(adminEntities[ENTITY].idColumn.valueType, id))
    return adminJsonError("Invalid id", 400)

  try {
    const detail = await fetchAdminEntityDetailForApi(ctx, ENTITY, id)
    if (!detail) return adminJsonError("Not found", 404)
    return NextResponse.json(await withPropertyListIdAndRef(id, detail))
  } catch (cause) {
    console.error(`[GET /api/admin/property-entities/${id}]`, cause)
    return adminJsonError("Failed to load row", 500)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  if (!isValidAdminEntityIdParam(adminEntities[ENTITY].idColumn.valueType, id))
    return adminJsonError("Invalid id", 400)

  const parsed = await parseAdminEntityPatchBody(adminEntities, ENTITY, request)
  if (!parsed.ok) return parsed.response

  try {
    const row = await completeAdminEntityPatchWithMaybeExtras(
      ctx,
      ENTITY,
      id,
      parsed.patch,
      parsed.junctionSync,
      parsed.extras,
    )
    if (!row) return adminJsonError("Not found", 404)
    const withId = await withPropertyListIdAndRef(id, row as Record<string, unknown>)
    const entityId = Number(withId.entityId)
    const warnings =
      Number.isFinite(entityId) && entityId > 0
        ? await syncEntityToGoogleContacts(entityId)
        : []
    return NextResponse.json(attachGoogleContactsWarnings(withId, warnings))
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    if (
      msg.startsWith("[completeAdminEntityPatchWithMaybeExtras]") &&
      msg.includes("extras not supported")
    )
      return adminJsonError("Unsupported PATCH payload", 400)
    if (msg.startsWith("[VALIDATION]"))
      return adminJsonError(msg.replace("[VALIDATION] ", ""), 400)
    console.error(`[PATCH /api/admin/property-entities/${id}]`, cause)
    return adminJsonError("Failed to update row", 500)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  if (!isValidAdminEntityIdParam(adminEntities[ENTITY].idColumn.valueType, id))
    return adminJsonError("Invalid id", 400)

  const propertyEntityId = Number(id)
  try {
    // Look up property and primary buyer IDs before deleting
    const [link] = await db
      .select({ propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)

    if (link?.propertyListId != null) {
      const [prop] = await db
        .select({
          primaryPhoneBuyerPropertyEntityId: pandaProperties.primaryPhoneBuyerPropertyEntityId,
          primaryEmailBuyerPropertyEntityId: pandaProperties.primaryEmailBuyerPropertyEntityId,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, link.propertyListId))
        .limit(1)

      const isPhonePrimary = prop?.primaryPhoneBuyerPropertyEntityId === propertyEntityId
      const isEmailPrimary = prop?.primaryEmailBuyerPropertyEntityId === propertyEntityId

      if (isPhonePrimary || isEmailPrimary) {
        const [next] = await db
          .select({ propertyEntityId: propertyEntities.propertyEntityId })
          .from(propertyEntities)
          .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
          .where(
            and(
              eq(propertyEntities.propertyListId, link.propertyListId),
              ne(propertyEntities.propertyEntityId, propertyEntityId),
              eq(entities.entityCategoryId, BUYER_ENTITY_CATEGORY_ID),
              sql`NOT EXISTS(SELECT 1 FROM panda_realty.buyer_offers bo WHERE bo.property_entity_id = ${propertyEntities.propertyEntityId} AND bo.is_accepted = true)`,
            ),
          )
          .orderBy(asc(entities.entityName))
          .limit(1)

        const nextId = next?.propertyEntityId ?? null
        const patch: Partial<{ primaryPhoneBuyerPropertyEntityId: number | null; primaryEmailBuyerPropertyEntityId: number | null }> = {}
        if (isPhonePrimary) patch.primaryPhoneBuyerPropertyEntityId = nextId
        if (isEmailPrimary) patch.primaryEmailBuyerPropertyEntityId = nextId
        await db
          .update(pandaProperties)
          .set(patch)
          .where(eq(pandaProperties.propertyListId, link.propertyListId))
      }
    }

    const deleted = await db
      .delete(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .returning({ propertyEntityId: propertyEntities.propertyEntityId })
    if (deleted.length === 0) return adminJsonError("Not found", 404)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error(`[DELETE /api/admin/property-entities/${id}]`, cause)
    return adminJsonError("Failed to delete property entity", 500)
  }
}
