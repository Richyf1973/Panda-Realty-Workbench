import "server-only"

import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaSuburbs } from "@/db/schema"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const rows = await db
    .select({ suburb: pandaSuburbs.suburb, state: pandaSuburbs.state })
    .from(pandaSuburbs)
    .orderBy(asc(pandaSuburbs.suburb), asc(pandaSuburbs.state))

  const options = rows.map((r) => ({
    value: `${r.suburb}||${r.state}`,
    label: `${r.suburb}, ${r.state}`,
  }))

  return NextResponse.json({ options })
}
