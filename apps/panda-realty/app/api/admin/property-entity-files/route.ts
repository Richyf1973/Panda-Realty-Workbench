import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyEntityFiles } from "@/db/schema"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("propertyEntityId")
  const propertyEntityId = raw != null ? Number(raw) : NaN

  if (!Number.isFinite(propertyEntityId) || propertyEntityId <= 0) {
    return adminJsonError("Missing or invalid propertyEntityId query param", 400)
  }

  const rows = await db
    .select()
    .from(propertyEntityFiles)
    .where(eq(propertyEntityFiles.propertyEntityId, propertyEntityId))
    .orderBy(propertyEntityFiles.propertyEntityFileId)

  return NextResponse.json(rows)
}
