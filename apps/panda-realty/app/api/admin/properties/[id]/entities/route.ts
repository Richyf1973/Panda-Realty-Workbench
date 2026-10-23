import "server-only"

import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entities, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    const rows = await db
      .select({
        propertyEntityId: propertyEntities.propertyEntityId,
        entityName: entities.entityName,
        entityCategoryId: entities.entityCategoryId,
      })
      .from(propertyEntities)
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(eq(propertyEntities.propertyListId, propertyListId))
      .orderBy(asc(entities.entityCategoryId), asc(entities.entityName))

    return NextResponse.json({ items: rows })
  } catch {
    return adminJsonError("Failed to fetch entities", 500)
  }
}
