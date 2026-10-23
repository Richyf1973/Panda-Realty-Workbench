import "server-only"

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"

export async function POST() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  // Insert distinct suburb+state combos from panda_properties.
  // initcap(lower(trim(...))) normalises casing; upper(trim(...)) for state codes.
  // citext UNIQUE on (suburb, state) means ON CONFLICT does nothing for case-insensitive duplicates.
  const rows = await db.execute<{ inserted: string }>(sql`
    WITH ins AS (
      INSERT INTO panda_realty.panda_suburbs (suburb, state)
      SELECT DISTINCT
        initcap(lower(trim(suburb))),
        upper(trim(state))
      FROM panda_realty.panda_properties
      WHERE trim(suburb) <> '' AND trim(state) <> ''
      ON CONFLICT (suburb, state) DO NOTHING
      RETURNING suburb_id
    )
    SELECT count(*)::int AS inserted FROM ins
  `)

  const inserted = Number((rows[0] as { inserted: string } | undefined)?.inserted ?? 0)
  return NextResponse.json({ inserted })
}
