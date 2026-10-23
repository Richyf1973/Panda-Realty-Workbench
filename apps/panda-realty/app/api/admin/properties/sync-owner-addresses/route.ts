import "server-only"

import { and, asc, inArray, or, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties } from "@/db/schema"

/** Rows per UPDATE to cap lock duration and WAL spikes on large tables. */
const BATCH_SIZE = 2000
/** Safety valve so one request cannot run unbounded. */
const MAX_BATCHES = 500

const streetNonempty = sql`btrim(${pandaProperties.streetAddress}::text) <> ''`

const ownerSlotNeedsFill = or(
  sql`(${pandaProperties.owner1address} IS NULL OR btrim(${pandaProperties.owner1address}::text) = '')`,
  sql`(${pandaProperties.owner2address} IS NULL OR btrim(${pandaProperties.owner2address}::text) = '')`,
  sql`(${pandaProperties.owner3address} IS NULL OR btrim(${pandaProperties.owner3address}::text) = '')`,
)

const needsSyncPredicate = and(streetNonempty, ownerSlotNeedsFill)

export async function POST() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let updated = 0
  let batches = 0

  try {
    for (;;) {
      if (batches >= MAX_BATCHES) {
        return adminJsonError(
          "Sync stopped after the maximum number of batches. Run again to continue.",
          413,
        )
      }

      const batch = await db
        .select({ id: pandaProperties.propertyListId })
        .from(pandaProperties)
        .where(needsSyncPredicate)
        .orderBy(asc(pandaProperties.propertyListId))
        .limit(BATCH_SIZE)

      if (batch.length === 0) break

      const ids = batch.map((r) => r.id)

      await db
        .update(pandaProperties)
        .set({
          owner1address: sql`CASE WHEN ${pandaProperties.owner1address} IS NULL OR btrim(${pandaProperties.owner1address}::text) = '' THEN ${pandaProperties.streetAddress} ELSE ${pandaProperties.owner1address} END`,
          owner2address: sql`CASE WHEN ${pandaProperties.owner2address} IS NULL OR btrim(${pandaProperties.owner2address}::text) = '' THEN ${pandaProperties.streetAddress} ELSE ${pandaProperties.owner2address} END`,
          owner3address: sql`CASE WHEN ${pandaProperties.owner3address} IS NULL OR btrim(${pandaProperties.owner3address}::text) = '' THEN ${pandaProperties.streetAddress} ELSE ${pandaProperties.owner3address} END`,
          updatedAt: sql`now()`,
        })
        .where(inArray(pandaProperties.propertyListId, ids))

      updated += batch.length
      batches += 1
    }

    return NextResponse.json({ updated, batches })
  } catch (err) {
    console.error("[POST /api/admin/properties/sync-owner-addresses]", err)
    return adminJsonError(
      `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
      500,
    )
  }
}
