import "server-only"

import { NextResponse } from "next/server"
import { desc, eq, inArray } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { agents, entities, propertyEntities, propertyEntityNotes, propertyListNotes } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const propertyListId = parseInt(id, 10)
  if (isNaN(propertyListId)) return adminJsonError("Invalid id", 400)

  try {
    const entityRows = await db
      .select({ propertyEntityId: propertyEntities.propertyEntityId })
      .from(propertyEntities)
      .where(eq(propertyEntities.propertyListId, propertyListId))

    const allEntityIds = entityRows.map((r) => r.propertyEntityId)

    const [listRows, entityNoteRows] = await Promise.all([
      db
        .select({
          noteId: propertyListNotes.propertyListNoteId,
          propertyEntityId: propertyListNotes.propertyEntityId,
          note: propertyListNotes.note,
          createdBy: propertyListNotes.createdBy,
          createdAt: propertyListNotes.createdAt,
          agentId: propertyListNotes.agentId,
          agentName: agents.agentName,
          agentEmail: agents.email,
          ownerNum: propertyListNotes.ownerNum,
          entityName: entities.entityName,
          entityCategoryId: entities.entityCategoryId,
          association: entities.association,
        })
        .from(propertyListNotes)
        .leftJoin(agents, eq(propertyListNotes.agentId, agents.agentId))
        .leftJoin(propertyEntities, eq(propertyListNotes.propertyEntityId, propertyEntities.propertyEntityId))
        .leftJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(eq(propertyListNotes.propertyListId, propertyListId))
        .orderBy(desc(propertyListNotes.createdAt), desc(propertyListNotes.propertyListNoteId)),

      allEntityIds.length > 0
        ? db
            .select({
              noteId: propertyEntityNotes.propertyEntityNoteId,
              propertyEntityId: propertyEntityNotes.propertyEntityId,
              note: propertyEntityNotes.note,
              createdBy: propertyEntityNotes.createdBy,
              createdAt: propertyEntityNotes.createdAt,
              agentId: propertyEntityNotes.agentId,
              agentName: agents.agentName,
              agentEmail: agents.email,
              entityName: entities.entityName,
              entityCategoryId: entities.entityCategoryId,
              association: entities.association,
            })
            .from(propertyEntityNotes)
            .leftJoin(agents, eq(propertyEntityNotes.agentId, agents.agentId))
            .leftJoin(propertyEntities, eq(propertyEntityNotes.propertyEntityId, propertyEntities.propertyEntityId))
            .leftJoin(entities, eq(propertyEntities.entityId, entities.entityId))
            .where(inArray(propertyEntityNotes.propertyEntityId, allEntityIds))
            .orderBy(desc(propertyEntityNotes.createdAt), desc(propertyEntityNotes.propertyEntityNoteId))
        : Promise.resolve([] as never[]),
    ])

    const listNotes = listRows.map((r) => ({ ...r, source: "property" as const }))
    const entityNoteMapped = entityNoteRows.map((r) => ({
      ...r,
      source: "entity" as const,
      ownerNum: null as number | null,
    }))

    const combined = [...listNotes, ...entityNoteMapped].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })

    return NextResponse.json(combined)
  } catch {
    return adminJsonError("Failed to fetch notes", 500)
  }
}
