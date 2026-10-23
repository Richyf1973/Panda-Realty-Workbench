import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { agents, propertyListNotes } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  let body: { note: string; agentId?: number | null }
  try {
    body = (await request.json()) as { note: string; agentId?: number | null }
  } catch {
    return adminJsonError("Invalid JSON", 400)
  }

  const trimmed = (body.note ?? "").trim()
  if (!trimmed) return adminJsonError("Note cannot be empty", 400)

  await db.insert(propertyListNotes).values({
    propertyListId,
    note: trimmed,
    createdBy: user.email ?? null,
    agentId: body.agentId ?? null,
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  const url = new URL(request.url)
  const ownerNumRaw = url.searchParams.get("ownerNum")
  const ownerNum = ownerNumRaw != null ? parseInt(ownerNumRaw, 10) : null
  if (ownerNum == null || isNaN(ownerNum) || ownerNum < 1 || ownerNum > 3) {
    return adminJsonError("ownerNum must be 1, 2, or 3", 400)
  }

  try {
    const rows = await db
      .select({
        propertyListNoteId: propertyListNotes.propertyListNoteId,
        note: propertyListNotes.note,
        createdBy: propertyListNotes.createdBy,
        createdAt: propertyListNotes.createdAt,
        agentName: agents.agentName,
      })
      .from(propertyListNotes)
      .leftJoin(agents, eq(propertyListNotes.agentId, agents.agentId))
      .where(
        and(
          eq(propertyListNotes.propertyListId, propertyListId),
          eq(propertyListNotes.ownerNum, ownerNum),
        ),
      )
      .orderBy(desc(propertyListNotes.createdAt), desc(propertyListNotes.propertyListNoteId))

    return NextResponse.json(rows)
  } catch {
    return adminJsonError("Failed to fetch notes", 500)
  }
}
