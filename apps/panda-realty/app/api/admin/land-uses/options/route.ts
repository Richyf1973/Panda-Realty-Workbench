import "server-only"

import { NextResponse } from "next/server"
import { asc, isNotNull } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties } from "@/db/schema"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const rows = await db
    .selectDistinct({ landUse1: pandaProperties.landUse1 })
    .from(pandaProperties)
    .where(isNotNull(pandaProperties.landUse1))
    .orderBy(asc(pandaProperties.landUse1))

  const options = rows
    .map((r) => r.landUse1)
    .filter((v): v is string => v != null && v !== "")
    .map((v) => ({ value: v, label: v }))

  return NextResponse.json({ options })
}
