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
  const rawPLI = searchParams.get("propertyListId")
  const rawPEI = searchParams.get("propertyEntityId")

  let propertyListId: number

  if (rawPEI) {
    const propertyEntityId = parseInt(rawPEI, 10)
    if (isNaN(propertyEntityId)) return adminJsonError("propertyEntityId must be an integer", 400)
    const [entity] = await db
      .select({ propertyListId: propertyEntities.propertyListId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)
    if (!entity?.propertyListId) return NextResponse.json(null)
    propertyListId = entity.propertyListId
  } else if (rawPLI) {
    propertyListId = parseInt(rawPLI, 10)
    if (isNaN(propertyListId)) return adminJsonError("propertyListId must be an integer", 400)
  } else {
    return adminJsonError("propertyListId or propertyEntityId is required", 400)
  }

  try {
    const [token] = await db
      .select()
      .from(portalTokens)
      .where(
        and(
          eq(portalTokens.propertyListId, propertyListId),
          eq(portalTokens.role, "seller"),
        ),
      )
      .orderBy(desc(portalTokens.portalTokenId))
      .limit(1)

    return NextResponse.json(token ?? null)
  } catch (err) {
    console.error("[portal-tokens/seller GET]", err)
    return adminJsonError("Internal server error", 500)
  }
}

const bodySchema = z.object({
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
    return adminJsonError("propertyListId is required integer", 400)
  }

  const { propertyListId } = parsed.data

  try {
    const [existing] = await db
      .select()
      .from(portalTokens)
      .where(
        and(
          eq(portalTokens.propertyListId, propertyListId),
          eq(portalTokens.role, "seller"),
          isNull(portalTokens.revokedAt),
        ),
      )
      .limit(1)

    if (existing) return NextResponse.json(existing)

    const [created] = await db
      .insert(portalTokens)
      .values({ propertyListId, role: "seller", token: crypto.randomUUID() })
      .returning()

    return NextResponse.json(created)
  } catch (err) {
    console.error("[portal-tokens/seller POST]", err)
    return adminJsonError("Internal server error", 500)
  }
}
