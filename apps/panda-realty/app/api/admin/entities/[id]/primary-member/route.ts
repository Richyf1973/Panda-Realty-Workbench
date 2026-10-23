import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { entities, entityMembers } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Set the buyer entity's primary-phone / primary-email member pointer.
 * Dedicated route because these columns are hidden pointers, not part of the
 * entities admin form (the generic PATCH only accepts form columns).
 */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const entityId = Number.parseInt(id, 10)
  if (!Number.isFinite(entityId) || entityId <= 0) {
    return adminJsonError("Invalid entity id", 400)
  }

  let body: { primaryPhoneMemberId?: number | null; primaryEmailMemberId?: number | null }
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const update: { primaryPhoneMemberId?: number | null; primaryEmailMemberId?: number | null } = {}
  for (const key of ["primaryPhoneMemberId", "primaryEmailMemberId"] as const) {
    if (!(key in body)) continue
    const value = body[key]
    if (value === null) {
      update[key] = null
      continue
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return adminJsonError(`${key} must be a member id or null`, 400)
    }
    // Guard against pointing at a member that belongs to a different entity (IDOR).
    const [member] = await db
      .select({ entityMemberId: entityMembers.entityMemberId })
      .from(entityMembers)
      .where(and(eq(entityMembers.entityMemberId, value), eq(entityMembers.entityId, entityId)))
      .limit(1)
    if (!member) {
      return adminJsonError(`${key} is not a member of this entity`, 400)
    }
    update[key] = value
  }

  if (Object.keys(update).length === 0) {
    return adminJsonError("Provide primaryPhoneMemberId and/or primaryEmailMemberId", 400)
  }

  try {
    await db.update(entities).set(update).where(eq(entities.entityId, entityId))
    return NextResponse.json({ ok: true, ...update })
  } catch (cause) {
    console.error(`[PATCH /api/admin/entities/${entityId}/primary-member]`, cause)
    return adminJsonError("Failed to update primary member", 500)
  }
}
