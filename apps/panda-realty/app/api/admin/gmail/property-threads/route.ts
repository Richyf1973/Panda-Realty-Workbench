import "server-only"

import { NextResponse } from "next/server"
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entities, propertyEntities } from "@/db/schema"
import { getGmailAccessToken, listGmailThreads } from "@/lib/gmail-client"
import { getSessionUser } from "@/lib/auth/session"

const ENTITY_CATEGORY_IDS = [1, 3, 4] // 1 = buyer, 3 = tenant, 4 = contact

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const rawId = searchParams.get("propertyListId")
  const propertyListId = rawId ? parseInt(rawId, 10) : NaN
  if (isNaN(propertyListId)) return adminJsonError("propertyListId is required", 400)

  try {
    const rows = await db
      .select({
        entityName: entities.entityName,
        emailAddress: entities.emailAddress,
      })
      .from(propertyEntities)
      .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
      .where(
        and(
          eq(propertyEntities.propertyListId, propertyListId),
          inArray(entities.entityCategoryId, ENTITY_CATEGORY_IDS),
          isNotNull(entities.emailAddress),
          ne(entities.emailAddress, ""),
        ),
      )

    const uniqueEmails = [...new Map(rows.map((r) => [r.emailAddress, r])).values()]

    if (uniqueEmails.length === 0) {
      return NextResponse.json({ groups: [] })
    }

    const accessToken = await getGmailAccessToken()

    const groups = await Promise.all(
      uniqueEmails.map(async ({ entityName, emailAddress }) => {
        const email = emailAddress!
        try {
          const threads = await listGmailThreads(accessToken, `from:"${email}" OR to:"${email}" OR "${email}"`)
          return { entityName: entityName ?? email, email, threads }
        } catch {
          return { entityName: entityName ?? email, email, threads: [] }
        }
      }),
    )

    return NextResponse.json({ groups })
  } catch (cause) {
    console.error("[GET /api/admin/gmail/property-threads]", cause)
    const message = cause instanceof Error ? cause.message : "Failed to load property threads"
    return adminJsonError(message, 500)
  }
}
