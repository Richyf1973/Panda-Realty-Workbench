import "server-only"

import { NextResponse } from "next/server"

import {
  adminJsonError,
  isValidAdminEntityIdParam,
  parseAdminEntityFieldsParam,
  parseAdminEntityPatchBody,
} from "@repo/admin/admin-api"
import {
  completeAdminEntityPatchWithMaybeExtras,
  deleteAdminEntityRow,
  fetchAdminEntityDetailForApi,
} from "@repo/admin/admin-entity-queries"

import { db } from "@/db"
import { adminEntities } from "@/lib/admin/admin-entity-registry"
import { adminEntityQueryContextCore } from "@/lib/admin/admin-server-context"
import { getSessionUser } from "@/lib/auth/session"
import {
  attachGoogleContactsWarnings,
  syncGoogleContactsForPropertyDetail,
} from "@/lib/google-contacts-sync.server"
import { syncPropertyNextConditionDue } from "@/lib/admin/sync-property-next-condition-due"

const ENTITY = "properties" as const
const ctx = { ...adminEntityQueryContextCore, db }

type RouteContext = { params: Promise<{ id: string }> }

/** 0 = has accepted offer, 1 = has any offer, 2 = no offers */
function offerTier(row: Record<string, unknown>): number {
  const offers = row["buyerOffers"]
  if (!Array.isArray(offers) || offers.length === 0) return 2
  const hasAccepted = offers.some(
    (o) => (o as Record<string, unknown>)["isAccepted"] === true,
  )
  return hasAccepted ? 0 : 1
}

/**
 * Promote entities-table fields to the top level of each propertyContacts row
 * so the inline table can seed contactCategoryId / association / contactCategory
 * as editable line state. These fields live on entities, not property_entities.
 */
function promoteContactEntityFields(
  detail: Record<string, unknown>,
): Record<string, unknown> {
  const contacts = detail["propertyContacts"]
  if (!Array.isArray(contacts)) return detail
  const promoted = contacts.map((c) => {
    const row = c as Record<string, unknown>
    const entity = row["propertyEntity"] as
      | Record<string, unknown>
      | null
      | undefined
    if (entity == null) return row
    return {
      ...row,
      contactCategoryId: entity["contactCategoryId"] ?? null,
      contactCategory: entity["contactCategory"] ?? null,
      association: entity["association"] ?? null,
    }
  })
  return { ...detail, propertyContacts: promoted }
}

/** Re-sort propertyBuyers: accepted-offer buyer first, then any-offer, then no-offer. */
function sortBuyersByOfferTier(
  detail: Record<string, unknown>,
): Record<string, unknown> {
  const buyers = detail["propertyBuyers"]
  if (!Array.isArray(buyers)) return detail
  const sorted = [...buyers].sort(
    (a, b) =>
      offerTier(a as Record<string, unknown>) -
      offerTier(b as Record<string, unknown>),
  )
  return { ...detail, propertyBuyers: sorted }
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  if (!isValidAdminEntityIdParam(adminEntities[ENTITY].idColumn.valueType, id))
    return adminJsonError("Invalid id", 400)

  const fieldsRaw = new URL(request.url).searchParams.get("fields")
  const fieldsResult = parseAdminEntityFieldsParam(adminEntities[ENTITY], fieldsRaw)
  if (!fieldsResult.ok) {
    return adminJsonError(`Unknown field: ${fieldsResult.unknownField}`, 400)
  }

  try {
    const detail = await fetchAdminEntityDetailForApi(
      ctx,
      ENTITY,
      id,
      undefined,
      fieldsResult.fields ?? undefined,
    )
    if (!detail) return adminJsonError("Not found", 404)
    if (fieldsResult.fields) return NextResponse.json(detail)
    return NextResponse.json(
      promoteContactEntityFields(
        sortBuyersByOfferTier(detail as Record<string, unknown>),
      ),
    )
  } catch (cause) {
    console.error(`[GET /api/admin/properties/${id}]`, cause)
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
    // Contract/settlement edits change the condition candidate dates → recompute the materialised
    // next-condition-due so the property re-sorts on the list.
    if ("contractDate" in parsed.patch || "settlementDate" in parsed.patch) {
      const propertyListId = Number.parseInt(id, 10)
      if (Number.isFinite(propertyListId)) {
        await syncPropertyNextConditionDue(db, propertyListId)
      }
    }
    const shaped = promoteContactEntityFields(
      sortBuyersByOfferTier(row as Record<string, unknown>),
    )
    const warnings = await syncGoogleContactsForPropertyDetail(shaped)
    return NextResponse.json(attachGoogleContactsWarnings(shaped, warnings))
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    if (
      msg.startsWith("[completeAdminEntityPatchWithMaybeExtras]") &&
      msg.includes("extras not supported")
    )
      return adminJsonError("Unsupported PATCH payload", 400)
    if (msg.startsWith("[VALIDATION]"))
      return adminJsonError(msg.replace("[VALIDATION] ", ""), 400)
    console.error(`[PATCH /api/admin/properties/${id}]`, cause)
    return adminJsonError("Failed to update row", 500)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  if (!isValidAdminEntityIdParam(adminEntities[ENTITY].idColumn.valueType, id))
    return adminJsonError("Invalid id", 400)

  try {
    const row = await deleteAdminEntityRow(ctx, ENTITY, id)
    if (!row) return adminJsonError("Not found", 404)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error(`[DELETE /api/admin/properties/${id}]`, cause)
    return adminJsonError("Failed to delete row", 500)
  }
}
