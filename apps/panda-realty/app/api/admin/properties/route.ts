import { NextResponse } from "next/server"

import { adminJsonError, parseAdminEntityCreateBody, parseAdminEntityFieldsParam } from "@repo/admin/admin-api"
import { parseAdminEntityBooleanListFilter } from "@repo/admin/admin-entity-list-boolean-filter-parse-server"
import { listAdminEntityPage } from "@repo/admin/admin-entity-list-page"
import { adminEntityListAppendWhereHintsFromSearchParams } from "@repo/admin/admin-entity-admin-list-fetch"
import { parseAdminEntityManyRelationListFilters } from "@repo/admin/admin-entity-list-many-relation-filter-parse-server"
import { parseAdminEntityRelationListFilters } from "@repo/admin/admin-entity-list-relation-filter-parse-server"
import { parseAdminEntityListSortParams } from "@repo/admin/admin-entity-list-sort-params-server"
import { ADMIN_ENTITY_LIST_MAX_LIMIT } from "@repo/admin/admin-entity-list-api"
import type { AdminEntityListServerContext } from "@repo/admin/admin-entity-types"
import { completeAdminEntityCreateWithMaybeExtras } from "@repo/admin/admin-entity-queries"
import type { AdminEntityQueryServerContext } from "@repo/admin/admin-entity-types"
import { adminEntities } from "@/lib/admin/admin-entity-registry"
import { adminEntityListContextCore, adminEntityQueryContextCore } from "@/lib/admin/admin-server-context"
import {
  adminJsonErrorWithOptionalDevDetail,
  postgresAdminErrorClientMessage,
} from "@/lib/admin/postgres-admin-error-client-message.server"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { frontendConfig } from "@/lib/config/frontend"
import {
  fetchAcceptedOffersByPropertyListId,
  fetchDueHighlightByPropertyListId,
  fetchPrimaryBuyerContacts,
} from "./panda-properties-list-enrichment"

const COMMISSION_NO_OFFER_LABEL = "No offer yet"

const adminEntityListServerContext: AdminEntityListServerContext = {
  ...adminEntityListContextCore,
  db,
}

const adminEntityQueryServerContext: AdminEntityQueryServerContext = {
  ...adminEntityQueryContextCore,
  db,
}

function parseListLimit(raw: string | null): number {
  const def = frontendConfig.admin.entityListPageSizeOptions[0]
  if (raw == null || raw === "") return def
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return def
  return Math.min(Math.max(1, n), ADMIN_ENTITY_LIST_MAX_LIMIT)
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const url = new URL(request.url)

  const fieldsRaw = url.searchParams.get("fields")
  const fieldsResult = parseAdminEntityFieldsParam(adminEntities["properties"], fieldsRaw)
  if (!fieldsResult.ok) {
    return adminJsonError(`Unknown field: ${fieldsResult.unknownField}`, 400)
  }
  const fieldsFilter = fieldsResult.fields ?? undefined

  const limit = parseListLimit(url.searchParams.get("limit"))
  const pageRaw = url.searchParams.get("page")
  const cursorAfter = url.searchParams.get("cursorAfter")
  const cursorBefore = url.searchParams.get("cursorBefore")
  const searchRaw = url.searchParams.get("search")
  const search = searchRaw != null && searchRaw !== "" ? searchRaw.trim() : undefined
  const booleanFilterValue = parseAdminEntityBooleanListFilter(adminEntities, "properties", url.searchParams)
  const primarySort = parseAdminEntityListSortParams(adminEntities, "properties", url.searchParams)
  const { api: relationFilterValues } = parseAdminEntityRelationListFilters(adminEntities, "properties", url.searchParams)
  const { api: manyRelationFilterValues } = parseAdminEntityManyRelationListFilters(adminEntities, "properties", url.searchParams)
  const baseHints = adminEntityListAppendWhereHintsFromSearchParams(adminEntities["properties"], url.searchParams)
  const rawStreetFilter = url.searchParams.get("streetFilter")?.trim() ?? ""
  const appendListWhereHints = rawStreetFilter ? { ...baseHints, streetFilter: rawStreetFilter } : baseHints

  // Anchor / point of interest: the property whose row map icon was tapped. Force-included and
  // pinned to row 1 of the filtered results (see admin-entity-list-pin-top).
  const pinTopIdRaw = Number.parseInt(url.searchParams.get("pinTopId") ?? "", 10)
  const pinTopId = Number.isInteger(pinTopIdRaw) && pinTopIdRaw > 0 ? pinTopIdRaw : undefined

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
    pinTopId === undefined &&
    fieldsFilter === undefined
      ? undefined
      : {
          ...(search ? { search } : {}),
          ...(booleanFilterValue !== undefined ? { booleanFilterValue } : {}),
          ...(primarySort ? { primarySort } : {}),
          ...(hasRelationFilters ? { relationFilterValues } : {}),
          ...(hasManyRelationFilters ? { manyRelationFilterValues } : {}),
          ...(hasAppendListWhereHints ? { appendListWhereHints } : {}),
          ...(pinTopId !== undefined ? { pinTopId } : {}),
          ...(fieldsFilter !== undefined ? { fieldsFilter } : {}),
        }

  try {
    let payload
    if (pageRaw != null && pageRaw !== "") {
      const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1)
      payload = await listAdminEntityPage(adminEntityListServerContext, "properties", limit, { mode: "page", page }, listOptions)
    } else if (cursorAfter != null && cursorAfter !== "") {
      payload = await listAdminEntityPage(adminEntityListServerContext, "properties", limit, { mode: "cursorAfter", cursor: cursorAfter }, listOptions)
    } else if (cursorBefore != null && cursorBefore !== "") {
      payload = await listAdminEntityPage(adminEntityListServerContext, "properties", limit, { mode: "cursorBefore", cursor: cursorBefore }, listOptions)
    } else {
      payload = await listAdminEntityPage(adminEntityListServerContext, "properties", limit, { mode: "page", page: 1 }, listOptions)
    }

    const items = payload.items as Record<string, unknown>[]
    const propertyListIds = items
      .map((item) => item["propertyListId"])
      .filter((id): id is number => typeof id === "number")

    const [offerMap, buyerContactMap, dueHighlightMap] = await Promise.all([
      fetchAcceptedOffersByPropertyListId(propertyListIds),
      fetchPrimaryBuyerContacts(items),
      fetchDueHighlightByPropertyListId(propertyListIds),
    ])
    const enrichedItems = items.map((item) => {
      const id = item["propertyListId"] as number | undefined
      const enrichment = id != null ? offerMap.get(id) : undefined
      const buyerContact = id != null ? buyerContactMap.get(id) : undefined
      const dueHighlight = id != null ? dueHighlightMap.get(id) : undefined
      const commissionRate = item["commissionRate"]
      const commissionAmount =
        enrichment != null
          ? (enrichment.commissionAmount ?? null)
          : commissionRate != null && String(commissionRate).trim() !== ""
            ? COMMISSION_NO_OFFER_LABEL
            : null
      return {
        ...item,
        contractPrice: enrichment?.contractPrice ?? null,
        commissionAmount,
        coolingOffDate: enrichment?.coolingOffDate ?? null,
        buildingPestDate: enrichment?.buildingPestDate ?? null,
        financeDate: enrichment?.financeDate ?? null,
        dueDiligenceDate: enrichment?.dueDiligenceDate ?? null,
        saleOfPropertyDate: enrichment?.saleOfPropertyDate ?? null,
        unconditionalContractDate: enrichment?.unconditionalContractDate ?? null,
        completionDate: enrichment?.completionDate ?? null,
        isCashOffer: enrichment?.isCashOffer ?? null,
        noConditions: enrichment?.noConditions ?? null,
        isSubjectToSale: enrichment?.isSubjectToSale ?? null,
        otherConditions: enrichment?.otherConditions ?? null,
        successfulBuyer: enrichment?.successfulBuyer ?? null,
        successfulBuyerPropertyEntityId: enrichment?.successfulBuyerPropertyEntityId ?? null,
        successfulBuyerEntityId: enrichment?.successfulBuyerEntityId ?? null,
        successfulBuyerPhoneNumber: enrichment?.successfulBuyerPhoneNumber ?? null,
        successfulBuyerEmailAddress: enrichment?.successfulBuyerEmailAddress ?? null,
        primaryBuyerPhone: buyerContact?.phone ?? null,
        primaryBuyerEmail: buyerContact?.email ?? null,
        primaryBuyerName: buyerContact?.name ?? null,
        primaryBuyerEmailName: buyerContact?.emailName ?? null,
        dueHighlightActive: dueHighlight?.active ?? false,
        dueHighlightLabels: dueHighlight?.labels ?? [],
        dueWarningActive: dueHighlight?.warning ?? false,
        dueWarningLabels: dueHighlight?.warningLabels ?? [],
        dueWarningTier: dueHighlight?.warningTier ?? null,
      }
    })

    return NextResponse.json({ ...payload, items: enrichedItems })
  } catch (cause) {
    console.error("[GET /api/admin/properties]", cause)
    return adminJsonError(adminEntities["properties"].ui.loadErrorLabel, 500)
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const parsed = await parseAdminEntityCreateBody(adminEntities, "properties", request)
  if (!parsed.ok) return parsed.response

  try {
    const row = await completeAdminEntityCreateWithMaybeExtras(
      adminEntityQueryServerContext,
      "properties",
      parsed.values,
      parsed.junctionSync,
      parsed.extras,
    )
    return NextResponse.json(row, { status: 201 })
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    if (msg.includes("23505") || msg.includes("duplicate key value")) {
      return adminJsonError("A property with that value already exists.", 409)
    }
    console.error("[POST /api/admin/properties]", cause)
    const friendly = postgresAdminErrorClientMessage(cause)
    return adminJsonErrorWithOptionalDevDetail(
      friendly ?? "Failed to create property",
      500,
      cause,
    )
  }
}
