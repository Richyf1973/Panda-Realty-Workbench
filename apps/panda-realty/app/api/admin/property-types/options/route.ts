import "server-only"

import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaPropertyTypes } from "@/db/schema"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const rows = await db
    .select({ label: pandaPropertyTypes.label })
    .from(pandaPropertyTypes)
    .orderBy(asc(pandaPropertyTypes.label))

  const options = rows.map((r) => ({ value: r.label, label: r.label }))

  return NextResponse.json({ options })
}
