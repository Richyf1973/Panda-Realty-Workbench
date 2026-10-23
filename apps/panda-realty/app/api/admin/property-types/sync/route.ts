import "server-only"

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"

export async function POST() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  // Insert canonical (title-cased) distinct property types from panda_properties.
  // initcap(lower(trim(...))) normalises "HOUSE", "house", "House" → "House".
  // citext UNIQUE on panda_property_types.label means ON CONFLICT does nothing for
  // case-insensitive duplicates ("House" conflicts with "house" etc.).
  // The CTE counts how many rows were actually inserted.
  const rows = await db.execute<{ inserted: string }>(sql`
    WITH ins AS (
      INSERT INTO panda_realty.panda_property_types (label)
      SELECT DISTINCT initcap(lower(trim(property_type)))
      FROM panda_realty.panda_properties
      WHERE trim(property_type) <> ''
      ON CONFLICT (label) DO NOTHING
      RETURNING property_type_id
    )
    SELECT count(*)::int AS inserted FROM ins
  `)

  const inserted = Number((rows[0] as { inserted: string } | undefined)?.inserted ?? 0)

  return NextResponse.json({ inserted })
}
