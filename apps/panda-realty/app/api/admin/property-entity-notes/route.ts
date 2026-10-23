import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { agents, propertyEntityNotes } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const url = new URL(req.url)
  const propertyEntityId = parseInt(url.searchParams.get("propertyEntityId") ?? "", 10)
  if (!Number.isInteger(propertyEntityId) || propertyEntityId <= 0) {
    return adminJsonError("propertyEntityId must be a positive integer", 400)
  }

  try {
    const rows = await db
      .select({
        propertyEntityNoteId: propertyEntityNotes.propertyEntityNoteId,
        note: propertyEntityNotes.note,
        createdBy: propertyEntityNotes.createdBy,
        createdAt: propertyEntityNotes.createdAt,
        agentName: agents.agentName,
      })
      .from(propertyEntityNotes)
      .leftJoin(agents, eq(propertyEntityNotes.agentId, agents.agentId))
      .where(eq(propertyEntityNotes.propertyEntityId, propertyEntityId))
      .orderBy(desc(propertyEntityNotes.createdAt), desc(propertyEntityNotes.propertyEntityNoteId))

    return NextResponse.json(rows)
  } catch {
    return adminJsonError("Failed to fetch notes", 500)
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: { propertyEntityId: number; note: string; agentId?: number | null }
  try {
    body = (await req.json()) as { propertyEntityId: number; note: string; agentId?: number | null }
  } catch {
    return adminJsonError("Invalid JSON", 400)
  }

  const { propertyEntityId, note, agentId } = body

  if (!Number.isInteger(propertyEntityId) || propertyEntityId <= 0) {
    return adminJsonError("Invalid property entity ID", 400)
  }
  const trimmed = (note ?? "").trim()
  if (!trimmed) return adminJsonError("Note cannot be empty", 400)

  await db.insert(propertyEntityNotes).values({
    propertyEntityId,
    note: trimmed,
    createdBy: user.email ?? null,
    agentId: agentId ?? null,
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
