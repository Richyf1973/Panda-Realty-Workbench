import "server-only"

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entities, entityMembers, propertyEntities } from "@/db/schema"
import { getGmailAccessToken, listGmailThreads } from "@/lib/gmail-client"
import { getSessionUser } from "@/lib/auth/session"
import { filterThreadsByProperty } from "@/lib/gmail-property-filter"

async function resolveAfterDate(
  email: string,
  propertyListId: number,
  propertyEntityId: number | null,
): Promise<Date | null> {
  if (propertyEntityId != null) {
    const [row] = await db
      .select({ createdAt: propertyEntities.createdAt })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyEntityId, propertyEntityId))
      .limit(1)
    return row?.createdAt ?? null
  }

  const [entityRow] = await db
    .select({ createdAt: propertyEntities.createdAt })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(and(eq(propertyEntities.propertyListId, propertyListId), eq(entities.emailAddress, email)))
    .limit(1)
  if (entityRow) return entityRow.createdAt

  const [memberRow] = await db
    .select({ createdAt: propertyEntities.createdAt })
    .from(propertyEntities)
    .innerJoin(entityMembers, eq(propertyEntities.entityId, entityMembers.entityId))
    .where(
      and(eq(propertyEntities.propertyListId, propertyListId), eq(entityMembers.memberEmailAddress, email)),
    )
    .limit(1)
  return memberRow?.createdAt ?? null
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")?.trim()
  const rawId = searchParams.get("propertyListId")
  const showAll = searchParams.get("showAll") === "true"

  if (!email) return adminJsonError("email is required", 400)
  const propertyListId = rawId ? parseInt(rawId, 10) : NaN
  if (isNaN(propertyListId)) return adminJsonError("propertyListId is required", 400)

  const rawPeId = searchParams.get("propertyEntityId")
  const propertyEntityId = rawPeId ? parseInt(rawPeId, 10) : null

  try {
    const accessToken = await getGmailAccessToken()
    const allThreads = await listGmailThreads(accessToken, `from:"${email}" OR to:"${email}" OR "${email}"`)

    if (showAll) {
      return NextResponse.json({ threads: allThreads, hiddenCount: 0 })
    }

    const afterDate = await resolveAfterDate(email, propertyListId, propertyEntityId)
    const { threads, hiddenCount } = await filterThreadsByProperty(allThreads, propertyListId, afterDate)
    return NextResponse.json({ threads, hiddenCount })
  } catch (cause) {
    console.error("[GET /api/admin/gmail/property-contact-threads]", cause)
    return adminJsonError("Failed to load email threads — please try again", 500)
  }
}
