import "server-only"

import { eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError, parseAdminEntityCreateBody } from "@repo/admin/admin-api"
import { parseAdminEntityBooleanListFilter } from "@repo/admin/admin-entity-list-boolean-filter-parse-server"
import { ADMIN_ENTITY_LIST_MAX_LIMIT } from "@repo/admin/admin-entity-list-api"
import { listAdminEntityPage } from "@repo/admin/admin-entity-list-page"
import { adminEntityListAppendWhereHintsFromSearchParams } from "@repo/admin/admin-entity-admin-list-fetch"
import { parseAdminEntityManyRelationListFilters } from "@repo/admin/admin-entity-list-many-relation-filter-parse-server"
import { parseAdminEntityRelationListFilters } from "@repo/admin/admin-entity-list-relation-filter-parse-server"
import { parseAdminEntityListSortParams } from "@repo/admin/admin-entity-list-sort-params-server"
import { completeAdminEntityCreateWithMaybeExtras } from "@repo/admin/admin-entity-queries"

import { db } from "@/db"
import { pandaProperties, propertyEntities } from "@/db/schema"
import { adminEntities } from "@/lib/admin/admin-entity-registry"
import {
  adminEntityListContextCore,
  adminEntityQueryContextCore,
} from "@/lib/admin/admin-server-context"
import { getSessionUser } from "@/lib/auth/session"
import { frontendConfig } from "@/lib/config/frontend"
import {
  adminJsonErrorWithOptionalDevDetail,
  postgresAdminErrorClientMessage,
} from "@/lib/admin/postgres-admin-error-client-message.server"
import { validatePropertyEntityCreatePropertyListId } from "@/lib/admin/property-entity-post-validate.server"
import {
  attachGoogleContactsWarnings,
  syncEntityToGoogleContacts,
} from "@/lib/google-contacts-sync.server"

const ENTITY = "property-entities" as const
const listCtx = { ...adminEntityListContextCore, db }
const queryCtx = { ...adminEntityQueryContextCore, db }

function parseListLimit(raw: string | null): number {
  const def = frontendConfig.admin.entityListPageSizeOptions[0]
  if (raw == null || raw === "") return def
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return def
  return Math.min(Math.max(1, n), ADMIN_ENTITY_LIST_MAX_LIMIT)
}

function isDuplicateKeyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.message.includes("23505") || err.message.includes("duplicate key value")) return true
  return isDuplicateKeyError(err.cause)
}

/** Batch-enrich list items with propertyRef using a single JOIN query. */
async function enrichWithPropertyRef(
  items: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (items.length === 0) return items
  const ids = items
    .map((item) => Number(item.propertyEntityId))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (ids.length === 0) return items.map((item) => ({ ...item, propertyRef: null }))

  const rows = await db
    .select({
      propertyEntityId: propertyEntities.propertyEntityId,
      streetAddress: pandaProperties.streetAddress,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
    })
    .from(propertyEntities)
    .leftJoin(
      pandaProperties,
      eq(pandaProperties.propertyListId, propertyEntities.propertyListId),
    )
    .where(inArray(propertyEntities.propertyEntityId, ids))

  const refMap = new Map<number, { streetAddress: string; state: string | null; postcode: string | null } | null>()
  for (const row of rows) {
    refMap.set(
      row.propertyEntityId,
      row.streetAddress != null
        ? { streetAddress: row.streetAddress, state: row.state, postcode: row.postcode }
        : null,
    )
  }

  return items.map((item) => ({
    ...item,
    propertyRef: refMap.get(Number(item.propertyEntityId)) ?? null,
  }))
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const url = new URL(request.url)
  const limit = parseListLimit(url.searchParams.get("limit"))
  const pageRaw = url.searchParams.get("page")
  const cursorAfter = url.searchParams.get("cursorAfter")
  const cursorBefore = url.searchParams.get("cursorBefore")
  const searchRaw = url.searchParams.get("search")
  const search = searchRaw != null && searchRaw !== "" ? searchRaw.trim() : undefined
  const booleanFilterValue = parseAdminEntityBooleanListFilter(
    adminEntities,
    ENTITY,
    url.searchParams,
  )
  const primarySort = parseAdminEntityListSortParams(adminEntities, ENTITY, url.searchParams)
  const { api: relationFilterValues } = parseAdminEntityRelationListFilters(
    adminEntities,
    ENTITY,
    url.searchParams,
  )
  const { api: manyRelationFilterValues } = parseAdminEntityManyRelationListFilters(
    adminEntities,
    ENTITY,
    url.searchParams,
  )
  const appendListWhereHints = adminEntityListAppendWhereHintsFromSearchParams(
    adminEntities[ENTITY],
    url.searchParams,
  )
  const hasRelationFilters = Object.keys(relationFilterValues).length > 0
  const hasManyRelationFilters = Object.keys(manyRelationFilterValues).length > 0
  const hasAppendListWhereHints = Object.keys(appendListWhereHints).length > 0
  const listOptions =
    !search &&
    booleanFilterValue === undefined &&
    primarySort === undefined &&
    !hasRelationFilters &&
    !hasManyRelationFilters &&
    !hasAppendListWhereHints
      ? undefined
      : {
          ...(search ? { search } : {}),
          ...(booleanFilterValue !== undefined ? { booleanFilterValue } : {}),
          ...(primarySort ? { primarySort } : {}),
          ...(hasRelationFilters ? { relationFilterValues } : {}),
          ...(hasManyRelationFilters ? { manyRelationFilterValues } : {}),
          ...(hasAppendListWhereHints ? { appendListWhereHints } : {}),
        }

  try {
    let payload
    if (pageRaw != null && pageRaw !== "") {
      const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1)
      payload = await listAdminEntityPage(listCtx, ENTITY, limit, { mode: "page", page }, listOptions)
    } else if (cursorAfter != null && cursorAfter !== "") {
      payload = await listAdminEntityPage(listCtx, ENTITY, limit, { mode: "cursorAfter", cursor: cursorAfter }, listOptions)
    } else if (cursorBefore != null && cursorBefore !== "") {
      payload = await listAdminEntityPage(listCtx, ENTITY, limit, { mode: "cursorBefore", cursor: cursorBefore }, listOptions)
    } else {
      payload = await listAdminEntityPage(listCtx, ENTITY, limit, { mode: "page", page: 1 }, listOptions)
    }
    const enrichedItems = await enrichWithPropertyRef(payload.items)
    return NextResponse.json({ ...payload, items: enrichedItems })
  } catch (cause) {
    console.error(`[GET /api/admin/property-entities]`, cause)
    return adminJsonError(adminEntities[ENTITY].ui.loadErrorLabel, 500)
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const parsed = await parseAdminEntityCreateBody(adminEntities, ENTITY, request)
  if (!parsed.ok) return parsed.response

  const propertyListGuard = await validatePropertyEntityCreatePropertyListId(
    request,
    parsed.values,
  )
  if (propertyListGuard != null) return propertyListGuard

  try {
    const row = await completeAdminEntityCreateWithMaybeExtras(
      queryCtx,
      ENTITY,
      parsed.values,
      parsed.junctionSync,
      parsed.extras,
    )
    const entityId = Number((row as Record<string, unknown>).entityId)
    const warnings =
      Number.isFinite(entityId) && entityId > 0
        ? await syncEntityToGoogleContacts(entityId)
        : []
    return NextResponse.json(attachGoogleContactsWarnings(row as Record<string, unknown>, warnings), { status: 201 })
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    if (
      msg.startsWith("[completeAdminEntityCreateWithMaybeExtras]") &&
      msg.includes("extras not supported")
    ) {
      return adminJsonError("Unsupported create payload", 400)
    }
    if (isDuplicateKeyError(cause)) {
      return adminJsonError(
        `A ${adminEntities[ENTITY].ui.singular} with that value already exists.`,
        409,
      )
    }
    console.error(`[POST /api/admin/property-entities]`, cause)
    const friendly = postgresAdminErrorClientMessage(cause)
    return adminJsonErrorWithOptionalDevDetail(
      friendly ?? `Failed to create ${adminEntities[ENTITY].ui.singular}`,
      500,
      cause,
    )
  }
}
