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
import type { AdminEntityQueryServerContext } from "@repo/admin/admin-entity-types"
import {
  adminEntities,
  adminEntitySlugExposesApi,
  isAdminEntitySlug,
} from "@/lib/admin/admin-entity-registry"
import { adminEntityQueryContextCore } from "@/lib/admin/admin-server-context"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { buyerOffers, entityMembers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { clearOtherBuyersRepresentativesForEntity } from "@/lib/admin/entity-members-buyers-representative.server"
import { autoSyncBuyerOfferCalendar, autoSyncEntityMemberCalendar } from "@/lib/calendar-auto-sync.server"
import {
  attachGoogleContactsWarnings,
  syncEntityToGoogleContacts,
} from "@/lib/google-contacts-sync.server"

const adminEntityQueryServerContext: AdminEntityQueryServerContext = {
  ...adminEntityQueryContextCore,
  db,
}

type RouteContext = { params: Promise<{ entity: string; id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { entity: entityParam, id } = await context.params
  if (!isAdminEntitySlug(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }
  if (!adminEntitySlugExposesApi(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }

  const idType = adminEntities[entityParam].idColumn.valueType
  if (!isValidAdminEntityIdParam(idType, id)) {
    return adminJsonError("Invalid id", 400)
  }

  const fieldsRaw = new URL(request.url).searchParams.get("fields")
  const fieldsResult = parseAdminEntityFieldsParam(adminEntities[entityParam], fieldsRaw)
  if (!fieldsResult.ok) {
    return adminJsonError(`Unknown field: ${fieldsResult.unknownField}`, 400)
  }

  try {
    const detail = await fetchAdminEntityDetailForApi(
      adminEntityQueryServerContext,
      entityParam,
      id,
      undefined,
      fieldsResult.fields ?? undefined,
    )
    if (!detail) return adminJsonError("Not found", 404)
    return NextResponse.json(detail)
  } catch (cause) {
    console.error(`[GET /api/admin/${entityParam}/[id]]`, cause)
    return adminJsonError("Failed to load row", 500)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { entity: entityParam, id } = await context.params
  if (!isAdminEntitySlug(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }
  if (!adminEntitySlugExposesApi(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }

  const idType = adminEntities[entityParam].idColumn.valueType
  if (!isValidAdminEntityIdParam(idType, id)) {
    return adminJsonError("Invalid id", 400)
  }

  const parsed = await parseAdminEntityPatchBody(
    adminEntities,
    entityParam,
    request,
  )
  if (!parsed.ok) return parsed.response

  if (entityParam === "entity-members" && parsed.patch.isBuyersRepresentative === "true") {
    const memberId = Number(id)
    if (Number.isFinite(memberId)) {
      const [hit] = await db
        .select({ entityId: entityMembers.entityId })
        .from(entityMembers)
        .where(eq(entityMembers.entityMemberId, memberId))
      if (hit) {
        await clearOtherBuyersRepresentativesForEntity(hit.entityId, memberId)
      }
    }
  }

  try {
    const row = await completeAdminEntityPatchWithMaybeExtras(
      adminEntityQueryServerContext,
      entityParam,
      id,
      parsed.patch,
      parsed.junctionSync,
      parsed.extras,
    )
    if (!row) return adminJsonError("Not found", 404)

    let responsePayload: Record<string, unknown> = row as Record<string, unknown>
    if (entityParam === "entities") {
      const entityId = Number((row as Record<string, unknown>).entityId)
      if (Number.isFinite(entityId) && entityId > 0) {
        const warnings = await syncEntityToGoogleContacts(entityId)
        responsePayload = attachGoogleContactsWarnings(responsePayload, warnings)
      }
    }

    const ENTITY_MEMBER_CALENDAR_FIELDS = new Set(["scheduledViewingDate"])
    const BUYER_OFFER_CALENDAR_FIELDS = new Set([
      "coolingOffDays", "financeDays", "subjectToSaleDays", "isCashOffer",
    ])

    if (
      entityParam === "entity-members" &&
      Object.keys(parsed.patch).some((k) => ENTITY_MEMBER_CALENDAR_FIELDS.has(k))
    ) {
      const memberId = Number(id)
      if (Number.isFinite(memberId)) {
        void autoSyncEntityMemberCalendar(memberId).catch((e) =>
          console.error("[auto-sync] entity-member PATCH", memberId, e),
        )
      }
    } else if (
      entityParam === "buyer-offers" &&
      Object.keys(parsed.patch).some((k) => BUYER_OFFER_CALENDAR_FIELDS.has(k))
    ) {
      const buyerOfferId = Number(id)
      if (Number.isFinite(buyerOfferId)) {
        void autoSyncBuyerOfferCalendar(buyerOfferId).catch((e) =>
          console.error("[auto-sync] buyer-offer PATCH", buyerOfferId, e),
        )
      }
    } else if (
      entityParam === "property-entities" &&
      Object.hasOwn(parsed.extras, "buyerOffers")
    ) {
      // Workspace save — isAccepted may have changed, affecting which events are active
      const propertyEntityId = Number(id)
      if (Number.isFinite(propertyEntityId)) {
        const offerRows = await db
          .select({ buyerOfferId: buyerOffers.buyerOfferId })
          .from(buyerOffers)
          .where(eq(buyerOffers.propertyEntityId, propertyEntityId))
        for (const { buyerOfferId } of offerRows) {
          void autoSyncBuyerOfferCalendar(buyerOfferId).catch((e) =>
            console.error("[auto-sync] buyer-offer workspace PATCH", buyerOfferId, e),
          )
        }
      }
    }

    return NextResponse.json(responsePayload)
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    if (
      msg.startsWith("[completeAdminEntityPatchWithMaybeExtras]") &&
      msg.includes("extras not supported")
    ) {
      return adminJsonError("Unsupported PATCH payload", 400)
    }
    if (msg.startsWith("[VALIDATION]")) {
      return adminJsonError(msg.replace("[VALIDATION] ", ""), 400)
    }
    console.error(`[PATCH /api/admin/${entityParam}/[id]]`, cause)
    return adminJsonError("Failed to update row", 500)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { entity: entityParam, id } = await context.params
  if (!isAdminEntitySlug(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }
  if (!adminEntitySlugExposesApi(entityParam)) {
    return adminJsonError("Unknown entity", 404)
  }

  const idType = adminEntities[entityParam].idColumn.valueType
  if (!isValidAdminEntityIdParam(idType, id)) {
    return adminJsonError("Invalid id", 400)
  }

  try {
    const row = await deleteAdminEntityRow(
      adminEntityQueryServerContext,
      entityParam,
      id,
    )
    if (!row) return adminJsonError("Not found", 404)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error(`[DELETE /api/admin/${entityParam}/[id]]`, cause)
    return adminJsonError("Failed to delete row", 500)
  }
}
