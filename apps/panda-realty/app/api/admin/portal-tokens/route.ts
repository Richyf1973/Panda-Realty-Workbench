import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { portalTokens, propertyEntities } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("propertyEntityId")
  const propertyEntityId = raw ? parseInt(raw, 10) : NaN
  if (!raw || isNaN(propertyEntityId)) return adminJsonError("propertyEntityId is required", 400)

  try {
    const [token] = await db
      .select()
      .from(portalTokens)
      .where(eq(portalTokens.propertyEntityId, propertyEntityId))
      .orderBy(desc(portalTokens.portalTokenId))
      .limit(1)

    return NextResponse.json(token ?? null)
  } catch (err) {
    console.error("[portal-tokens GET]", err)
    return adminJsonError("Internal server error", 500)
  }
}

const bodySchema = z.object({
  propertyEntityId: z.number().int(),
  propertyListId: z.number().int(),
})

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON", 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return adminJsonError("propertyEntityId and propertyListId are required integers", 400)
  }

  const { propertyEntityId, propertyListId } = parsed.data

  try {
    const [entity] = await db
      .select({ propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)

    if (!entity) return adminJsonError("Property entity not found", 404)

    const [existing] = await db
      .select()
      .from(portalTokens)
      .where(
        and(
          eq(portalTokens.propertyEntityId, propertyEntityId),
          isNull(portalTokens.revokedAt),
        ),
      )
      .limit(1)

    if (existing) return NextResponse.json(existing)

    const [created] = await db
      .insert(portalTokens)
      .values({ propertyEntityId, propertyListId: entity.propertyListId ?? propertyListId, token: crypto.randomUUID() })
      .returning()

    return NextResponse.json(created)
  } catch (err) {
    console.error("[portal-tokens POST]", err)
    return adminJsonError("Internal server error", 500)
  }
}
