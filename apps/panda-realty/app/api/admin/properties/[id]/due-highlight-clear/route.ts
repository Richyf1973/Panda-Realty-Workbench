import "server-only"

import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { syncPropertyNextConditionDue } from "@/lib/admin/sync-property-next-condition-due"

type RouteContext = { params: Promise<{ id: string }> }

/** Clears the due-date green highlight by stamping `due_highlight_cleared_at = now()`. */
export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    await db
      .update(pandaProperties)
      .set({ dueHighlightClearedAt: sql`now()` })
      .where(eq(pandaProperties.propertyListId, propertyListId))
    // Clearing suppresses the current condition → advance the list ordering to the next live one.
    await syncPropertyNextConditionDue(db, propertyListId)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error("[POST /api/admin/properties/[id]/due-highlight-clear]", cause)
    return adminJsonError("Failed to clear highlight", 500)
  }
}
