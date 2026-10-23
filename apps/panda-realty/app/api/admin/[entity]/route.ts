import { NextResponse } from "next/server"
import { and, eq, max } from "drizzle-orm"

import {
  adminJsonError,
  parseAdminEntityCreateBody,
  parseAdminEntityFieldsParam,
} from "@repo/admin/admin-api"
import { parseAdminEntityBooleanListFilter } from "@repo/admin/admin-entity-list-boolean-filter-parse-server"
import { listAdminEntityPage } from "@repo/admin/admin-entity-list-page"
import { adminEntityListAppendWhereHintsFromSearchParams } from "@repo/admin/admin-entity-admin-list-fetch"
import { parseAdminEntityManyRelationListFilters } from "@repo/admin/admin-entity-list-many-relation-filter-parse-server"
import { parseAdminEntityRelationListFilters } from "@repo/admin/admin-entity-list-relation-filter-parse-server"
import { parseAdminEntityListSortParams } from "@repo/admin/admin-entity-list-sort-params-server"
import { ADMIN_ENTITY_LIST_MAX_LIMIT } from "@repo/admin/admin-entity-list-api"
import { completeAdminEntityCreateWithMaybeExtras } from "@repo/admin/admin-entity-queries"
import type {
  AdminEntityListServerContext,
  AdminEntityQueryServerContext,
} from "@repo/admin/admin-entity-types"
import {
  adminEntities,
  adminEntitySlugExposesApi,
  isAdminEntitySlug,
} from "@/lib/admin/admin-entity-registry"
import {
  adminEntityListContextCore,
  adminEntityQueryContextCore,
} from "@/lib/admin/admin-server-context"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyStatus } from "@/db/schema"
import { clearAllBuyersRepresentativesForEntity } from "@/lib/admin/entity-members-buyers-representative.server"
import { validatePropertyEntityCreatePropertyListId } from "@/lib/admin/property-entity-post-validate.server"
import {
  adminJsonErrorWithOptionalDevDetail,
  postgresAdminErrorClientMessage,
} from "@/lib/admin/postgres-admin-error-client-message.server"
import { frontendConfig } from "@/lib/config/frontend"
import { autoSyncEntityMemberCalendar } from "@/lib/calendar-auto-sync.server"
import {
  attachGoogleContactsWarnings,
  syncEntityToGoogleContacts,
} from "@/lib/google-contacts-sync.server"

const adminEntityListServerContext: AdminEntityListServerContext = {
  ...adminEntityListContextCore,
  db,
}
const adminEntityQueryServerContext: AdminEntityQueryServerContext = {
  ...adminEntityQueryContextCore,
  db,
}

type RouteContext = { params: Promise<{ entity: string }> }

function isDuplicateKeyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.message.includes("23505") || err.message.includes("duplicate key value")) return true
  return isDuplicateKeyError(err.cause)
}

function parseListLimit(raw: string | null): number {
  const def = frontendConfig.admin.entityListPageSizeOptions[0]
  if (raw == null || raw === "") return def
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return def
  return Math.min(Math.max(1, n), ADMIN_ENTITY_LIST_MAX_LIMIT)
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { entity: entityParam } = await context.params
  if (!isAdminEntitySlug(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }
  if (!adminEntitySlugExposesApi(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }

  const url = new URL(request.url)

  const fieldsRaw = url.searchParams.get("fields")
  const fieldsResult = parseAdminEntityFieldsParam(adminEntities[entityParam], fieldsRaw)
  if (!fieldsResult.ok) {
    return adminJsonError(`Unknown field: ${fieldsResult.unknownField}`, 400)
  }
  const fieldsFilter = fieldsResult.fields ?? undefined

  const limit = parseListLimit(url.searchParams.get("limit"))
  const pageRaw = url.searchParams.get("page")
  const cursorAfter = url.searchParams.get("cursorAfter")
  const cursorBefore = url.searchParams.get("cursorBefore")
  const searchRaw = url.searchParams.get("search")
  const search =
    searchRaw != null && searchRaw !== "" ? searchRaw.trim() : undefined
  const booleanFilterValue = parseAdminEntityBooleanListFilter(
    adminEntities,
    entityParam,
    url.searchParams,
  )
  const primarySort = parseAdminEntityListSortParams(
    adminEntities,
    entityParam,
    url.searchParams,
  )
  const { api: relationFilterValues } = parseAdminEntityRelationListFilters(
    adminEntities,
    entityParam,
    url.searchParams,
  )
  const { api: manyRelationFilterValues } =
    parseAdminEntityManyRelationListFilters(
      adminEntities,
      entityParam,
      url.searchParams,
    )
  const baseHints = adminEntityListAppendWhereHintsFromSearchParams(
    adminEntities[entityParam],
    url.searchParams,
  )
  const rawStreetFilter =
    entityParam === "properties"
      ? (url.searchParams.get("streetFilter")?.trim() ?? "")
      : ""
  const appendListWhereHints = rawStreetFilter
    ? { ...baseHints, streetFilter: rawStreetFilter }
    : baseHints
  const hasRelationFilters = Object.keys(relationFilterValues).length > 0
  const hasManyRelationFilters = Object.keys(manyRelationFilterValues).length > 0
  const hasAppendListWhereHints = Object.keys(appendListWhereHints).length > 0
  const listOptions =
    !search &&
    booleanFilterValue === undefined &&
    primarySort === undefined &&
    !hasRelationFilters &&
    !hasManyRelationFilters &&
    !hasAppendListWhereHints &&
    fieldsFilter === undefined
      ? undefined
      : {
          ...(search ? { search } : {}),
          ...(booleanFilterValue !== undefined
            ? { booleanFilterValue }
            : {}),
          ...(primarySort ? { primarySort } : {}),
          ...(hasRelationFilters ? { relationFilterValues } : {}),
          ...(hasManyRelationFilters ? { manyRelationFilterValues } : {}),
          ...(hasAppendListWhereHints ? { appendListWhereHints } : {}),
          ...(fieldsFilter !== undefined ? { fieldsFilter } : {}),
        }

  try {
    let payload
    if (pageRaw != null && pageRaw !== "") {
      const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1)
      payload = await listAdminEntityPage(
        adminEntityListServerContext,
        entityParam,
        limit,
        {
          mode: "page",
          page,
        },
        listOptions,
      )
    } else if (cursorAfter != null && cursorAfter !== "") {
      payload = await listAdminEntityPage(
        adminEntityListServerContext,
        entityParam,
        limit,
        {
          mode: "cursorAfter",
          cursor: cursorAfter,
        },
        listOptions,
      )
    } else if (cursorBefore != null && cursorBefore !== "") {
      payload = await listAdminEntityPage(
        adminEntityListServerContext,
        entityParam,
        limit,
        {
          mode: "cursorBefore",
          cursor: cursorBefore,
        },
        listOptions,
      )
    } else {
      payload = await listAdminEntityPage(
        adminEntityListServerContext,
        entityParam,
        limit,
        {
          mode: "page",
          page: 1,
        },
        listOptions,
      )
    }
    return NextResponse.json(payload)
  } catch (cause) {
    console.error(`[GET /api/admin/${entityParam}]`, cause)
    return adminJsonError(adminEntities[entityParam].ui.loadErrorLabel, 500)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { entity: entityParam } = await context.params
  if (!isAdminEntitySlug(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }
  if (!adminEntitySlugExposesApi(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }

  const parsed = await parseAdminEntityCreateBody(
    adminEntities,
    entityParam,
    request,
  )
  if (!parsed.ok) return parsed.response

  if (entityParam === "property-entities") {
    const propertyListGuard = await validatePropertyEntityCreatePropertyListId(
      request,
      parsed.values,
    )
    if (propertyListGuard != null) return propertyListGuard
  }

  // property-status: insert then auto-assign sort_order within its pipeline tier
  if (entityParam === "property-status") {
    try {
      const row = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(propertyStatus)
          .values({
            propertyStatusCode: parsed.values["propertyStatusCode"] ?? "",
            propertyStatus: parsed.values["propertyStatus"] || null,
            isShownOnFavorite: parsed.values["isShownOnFavorite"] === "true",
            pipeline: parsed.values["pipeline"] || null,
          })
          .returning()
        if (!inserted) throw new Error("Insert returned no row")
        const pipeline = inserted.pipeline
        if (pipeline) {
          const [result] = await tx
            .select({ maxOrder: max(propertyStatus.sortOrder) })
            .from(propertyStatus)
            .where(eq(propertyStatus.pipeline, pipeline))
          const nextOrder = (result?.maxOrder ?? 0) + 1
          await tx
            .update(propertyStatus)
            .set({ sortOrder: nextOrder })
            .where(eq(propertyStatus.propertyStatusId, inserted.propertyStatusId))
          return { ...inserted, sortOrder: nextOrder }
        }
        return inserted
      })
      return NextResponse.json(row, { status: 201 })
    } catch (cause) {
      if (isDuplicateKeyError(cause)) {
        return adminJsonError("A property status with that value already exists.", 409)
      }
      console.error("[POST /api/admin/property-status]", cause)
      return adminJsonError("Failed to create property status", 500)
    }
  }

  try {
    if (
      entityParam === "entity-members" &&
      parsed.values.isBuyersRepresentative === "true"
    ) {
      const entityId = Number(parsed.values.entityId)
      if (Number.isFinite(entityId)) {
        await clearAllBuyersRepresentativesForEntity(entityId)
      }
    }

    const row = await completeAdminEntityCreateWithMaybeExtras(
      adminEntityQueryServerContext,
      entityParam,
      parsed.values,
      parsed.junctionSync,
      parsed.extras,
    )

    if (entityParam === "entity-members") {
      const memberId = Number((row as Record<string, unknown>).entityMemberId)
      if (Number.isFinite(memberId)) {
        void autoSyncEntityMemberCalendar(memberId).catch((e) =>
          console.error("[auto-sync] entity-member POST", memberId, e),
        )
      }
    }

    let responsePayload: Record<string, unknown> = row as Record<string, unknown>
    // Both the Entities page and the Contacts page write panda_realty.entities — sync either to Google Contacts.
    if (entityParam === "entities" || entityParam === "contacts") {
      const entityId = Number((row as Record<string, unknown>).entityId)
      if (Number.isFinite(entityId) && entityId > 0) {
        const warnings = await syncEntityToGoogleContacts(entityId)
        responsePayload = attachGoogleContactsWarnings(responsePayload, warnings)
      }
    }

    return NextResponse.json(responsePayload, { status: 201 })
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
        `A ${adminEntities[entityParam].ui.singular} with that value already exists.`,
        409,
      )
    }
    console.error(`[POST /api/admin/${entityParam}]`, cause)
    const generic = `Failed to create ${adminEntities[entityParam].ui.singular}`
    const friendly = postgresAdminErrorClientMessage(cause)
    return adminJsonErrorWithOptionalDevDetail(friendly ?? generic, 500, cause)
  }
}
