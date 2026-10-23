import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { portalTokens } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const portalTokenId = parseInt(id, 10)
  if (isNaN(portalTokenId)) return adminJsonError("Invalid id", 400)

  try {
    const [existing] = await db
      .select()
      .from(portalTokens)
      .where(eq(portalTokens.portalTokenId, portalTokenId))
      .limit(1)

    if (!existing) return adminJsonError("Token not found", 404)
    if (existing.revokedAt) return NextResponse.json(existing)

    const [updated] = await db
      .update(portalTokens)
      .set({ revokedAt: new Date() })
      .where(eq(portalTokens.portalTokenId, portalTokenId))
      .returning()

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[portal-tokens PATCH]", err)
    return adminJsonError("Internal server error", 500)
  }
}
