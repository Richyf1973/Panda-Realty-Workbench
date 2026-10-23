import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { pandaProperties, propertyEntities } from "@/db/schema"

/**
 * Validates `property-entities` create when `propertyListId` is set: duplicate junction and
 * property exists. Returns an error response, or `null` when validation passes.
 */
export async function validatePropertyEntityCreatePropertyListId(
  _request: Request,
  values: Record<string, string>,
): Promise<NextResponse | null> {
  const plRaw = values.propertyListId
  if (plRaw == null || String(plRaw).trim() === "") return null

  const propertyListId = Number(plRaw)
  const entityId = Number(values.entityId)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Property is invalid.", 400)
  }
  if (!Number.isFinite(entityId) || entityId <= 0) {
    return adminJsonError("Entity is invalid.", 400)
  }

  const dup = await db
    .select({ peid: propertyEntities.propertyEntityId })
    .from(propertyEntities)
    .where(
      and(
        eq(propertyEntities.entityId, entityId),
        eq(propertyEntities.propertyListId, propertyListId),
      ),
    )
    .limit(1)
  if (dup.length > 0) {
    return adminJsonError(
      "This buyer is already linked to that property.",
      409,
    )
  }

  const propRows = await db
    .select({ id: pandaProperties.propertyListId })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)
  if (propRows.length === 0) {
    return adminJsonError("Property not found.", 404)
  }

  return null
}
