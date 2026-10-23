import "server-only"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { propertyEntityNotes } from "@/db/schema"
import type { PropertyEntityWorkspaceDbTx } from "./entity-members-workspace-sync.server"

const propertyEntityNoteLineSchema = z.object({
  propertyEntityNoteId: z.number().int().positive().optional(),
  note: z.string(),
})

export function parsePropertyEntityNotesPayload(raw: unknown) {
  const parsed = z.array(propertyEntityNoteLineSchema).safeParse(raw)
  if (!parsed.success) {
    throw new Error("Invalid propertyEntityNotes payload")
  }
  return parsed.data.filter((l) => l.note.trim() !== "")
}

export async function syncPropertyEntityNotesInTx(
  tx: PropertyEntityWorkspaceDbTx,
  propertyEntityId: number,
  lines: ReturnType<typeof parsePropertyEntityNotesPayload>,
  createdByEmail: string | null,
): Promise<void> {
  const existing = await tx
    .select()
    .from(propertyEntityNotes)
    .where(eq(propertyEntityNotes.propertyEntityId, propertyEntityId))

  const keepIds = new Set(
    lines
      .map((l) => l.propertyEntityNoteId)
      .filter((x): x is number => typeof x === "number"),
  )

  for (const row of existing) {
    if (!keepIds.has(row.propertyEntityNoteId)) {
      await tx
        .delete(propertyEntityNotes)
        .where(
          eq(propertyEntityNotes.propertyEntityNoteId, row.propertyEntityNoteId),
        )
    }
  }

  for (const line of lines) {
    if (line.propertyEntityNoteId != null) {
      const [updated] = await tx
        .update(propertyEntityNotes)
        .set({
          note: line.note.trim(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(propertyEntityNotes.propertyEntityNoteId, line.propertyEntityNoteId),
            eq(propertyEntityNotes.propertyEntityId, propertyEntityId),
          ),
        )
        .returning()
      if (!updated) {
        throw new Error(
          `Property entity note ${line.propertyEntityNoteId} not found`,
        )
      }
    } else {
      await tx.insert(propertyEntityNotes).values({
        propertyEntityId,
        note: line.note.trim(),
        createdBy: createdByEmail?.trim() || null,
      })
    }
  }
}
