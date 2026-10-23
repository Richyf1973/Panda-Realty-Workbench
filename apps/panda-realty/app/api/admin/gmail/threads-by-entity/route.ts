import "server-only"

import { NextResponse } from "next/server"
import { and, eq, isNotNull, ne } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { entities, entityMembers, propertyEntities } from "@/db/schema"
import type { GmailThread } from "@/lib/gmail-client"
import { getGmailAccessToken, listGmailThreads } from "@/lib/gmail-client"
import { getSessionUser } from "@/lib/auth/session"
import { filterThreadsByProperty } from "@/lib/gmail-property-filter"

function buildEmailQuery(emails: string[]): string {
  return emails.map((e) => `from:"${e}" OR to:"${e}" OR "${e}"`).join(" OR ")
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const rawId = searchParams.get("entityId")
  const entityId = rawId ? parseInt(rawId, 10) : NaN
  if (isNaN(entityId)) return adminJsonError("entityId is required", 400)

  const rawPropId = searchParams.get("propertyListId")
  const propertyListId = rawPropId ? parseInt(rawPropId, 10) : NaN
  const hasPropertyFilter = !isNaN(propertyListId)
  const showAll = searchParams.get("showAll") === "true"

  try {
    const [entity] = await db
      .select({ emailAddress: entities.emailAddress })
      .from(entities)
      .where(eq(entities.entityId, entityId))
      .limit(1)

    const memberRows = await db
      .select({ memberEmailAddress: entityMembers.memberEmailAddress })
      .from(entityMembers)
      .where(
        and(
          eq(entityMembers.entityId, entityId),
          isNotNull(entityMembers.memberEmailAddress),
          ne(entityMembers.memberEmailAddress, ""),
        ),
      )

    const entityEmail = entity?.emailAddress?.trim() || null
    const memberEmails = [
      ...new Set(
        memberRows
          .map((r) => r.memberEmailAddress?.trim())
          .filter((e): e is string => Boolean(e)),
      ),
    ]

    if (!entityEmail && memberEmails.length === 0) {
      return NextResponse.json({ threads: [], hiddenCount: 0 })
    }

    const accessToken = await getGmailAccessToken()

    // Run entity and member queries in parallel; member threads are never date-filtered.
    const [entityThreadsRaw, memberThreads] = await Promise.all([
      entityEmail
        ? listGmailThreads(accessToken, buildEmailQuery([entityEmail]))
        : Promise.resolve([] as GmailThread[]),
      memberEmails.length > 0
        ? listGmailThreads(accessToken, buildEmailQuery(memberEmails))
        : Promise.resolve([] as GmailThread[]),
    ])

    // Apply date filter to entity email threads only.
    let entityThreads: GmailThread[]
    let hiddenCount = 0

    if (!hasPropertyFilter || showAll || !entityEmail) {
      entityThreads = entityThreadsRaw
    } else {
      const [linkRow] = await db
        .select({ createdAt: propertyEntities.createdAt })
        .from(propertyEntities)
        .where(and(eq(propertyEntities.entityId, entityId), eq(propertyEntities.propertyListId, propertyListId)))
        .limit(1)

      const afterDate = linkRow?.createdAt ?? null
      const filtered = await filterThreadsByProperty(entityThreadsRaw, propertyListId, afterDate)
      entityThreads = filtered.threads
      hiddenCount = filtered.hiddenCount
    }

    // Merge entity + member threads, deduplicate by threadId, sort newest first.
    const seen = new Set<string>()
    const merged: GmailThread[] = []
    for (const t of [...entityThreads, ...memberThreads]) {
      if (!seen.has(t.threadId)) {
        seen.add(t.threadId)
        merged.push(t)
      }
    }
    merged.sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return NextResponse.json({ threads: merged, hiddenCount })
  } catch (cause) {
    console.error("[GET /api/admin/gmail/threads-by-entity]", cause)
    const message = cause instanceof Error ? cause.message : "Failed to load threads"
    return adminJsonError(message, 500)
  }
}
