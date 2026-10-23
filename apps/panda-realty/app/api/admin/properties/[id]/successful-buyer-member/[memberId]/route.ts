import "server-only"

import { NextResponse } from "next/server"
import { and, asc, desc, eq, isNotNull } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entityMembers, offerFormSubmissions } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import {
  buildSubmissionSyncPatch,
  isSuccessfulBuyerSyncField,
} from "@/lib/admin/successful-buyer-offer-sync"

type RouteContext = { params: Promise<{ id: string; memberId: string }> }

/**
 * PATCH a single SUCCESSFUL BUYER member field and forward-sync it into the
 * latest submitted `offer_form_submissions` row for the buyer's property entity,
 * so the read-only Offer Form Submission panel stays consistent.
 *
 * Body: `{ field, value, propertyEntityId }`.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { memberId: memberIdParam } = await context.params
  const entityMemberId = parseInt(memberIdParam, 10)
  if (isNaN(entityMemberId)) return adminJsonError("Invalid member id", 400)

  let body: { field?: unknown; value?: unknown; propertyEntityId?: unknown }
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const { field } = body
  if (!isSuccessfulBuyerSyncField(field)) return adminJsonError("Unknown field", 400)
  const value = typeof body.value === "string" ? body.value : null
  const normalized = value && value.trim() !== "" ? value.trim() : null
  const propertyEntityId =
    typeof body.propertyEntityId === "number" ? body.propertyEntityId : Number(body.propertyEntityId)
  if (!Number.isFinite(propertyEntityId)) return adminJsonError("Invalid propertyEntityId", 400)

  try {
    // 1. Update the member field (the existing behavior).
    const [member] = await db
      .update(entityMembers)
      .set({ [field]: normalized, updatedAt: new Date() })
      .where(eq(entityMembers.entityMemberId, entityMemberId))
      .returning({
        entityId: entityMembers.entityId,
        isBuyersRepresentative: entityMembers.isBuyersRepresentative,
      })

    if (!member) return adminJsonError("Member not found", 404)

    // 2. Buyer's-representative members have no buyers_json entry — nothing to sync.
    if (member.isBuyersRepresentative) return NextResponse.json({ ok: true, synced: false })

    // 3. Non-rep index within the entity (mirrors upsertEntityMembersInTx ordering).
    const nonRepMembers = await db
      .select({ entityMemberId: entityMembers.entityMemberId })
      .from(entityMembers)
      .where(and(eq(entityMembers.entityId, member.entityId), eq(entityMembers.isBuyersRepresentative, false)))
      .orderBy(asc(entityMembers.entityMemberId))
    const memberIndex = nonRepMembers.findIndex((m) => m.entityMemberId === entityMemberId)
    if (memberIndex === -1) return NextResponse.json({ ok: true, synced: false })

    // 4. Latest submitted submission for this property entity (what the panel displays).
    const [submission] = await db
      .select({
        offerFormSubmissionId: offerFormSubmissions.offerFormSubmissionId,
        buyersJson: offerFormSubmissions.buyersJson,
      })
      .from(offerFormSubmissions)
      .where(and(
        eq(offerFormSubmissions.propertyEntityId, propertyEntityId),
        isNotNull(offerFormSubmissions.submittedAt),
      ))
      .orderBy(desc(offerFormSubmissions.submittedAt))
      .limit(1)

    if (!submission) return NextResponse.json({ ok: true, synced: false })

    // 5. Apply the sync patch.
    const patch = buildSubmissionSyncPatch({
      field,
      value: normalized,
      memberIndex,
      buyersJson: submission.buyersJson ?? null,
    })

    if (Object.keys(patch).length > 0) {
      await db
        .update(offerFormSubmissions)
        .set(patch as Partial<typeof offerFormSubmissions.$inferInsert>)
        .where(eq(offerFormSubmissions.offerFormSubmissionId, submission.offerFormSubmissionId))
    }

    return NextResponse.json({ ok: true, synced: Object.keys(patch).length > 0 })
  } catch (cause) {
    console.error(`[PATCH /api/admin/properties/[id]/successful-buyer-member/${entityMemberId}]`, cause)
    return adminJsonError("Failed to update successful buyer member", 500)
  }
}
