"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@repo/ui/button"

import { EmptyState, LoadingSkeleton, formatDate } from "@/app/admin/properties/board/panel-shared"
import { NoteExpandableText } from "./panda-note-item"
import { PandaPropertiesAddNoteDialog } from "./panda-properties-add-note-dialog"
import { CATEGORY_LABELS, CATEGORY_TESTIDS } from "./property-notes-constants"

type AllNote = {
  noteId: number
  propertyEntityId: number | null
  note: string
  createdBy: string | null
  createdAt: string | null
  entityName: string | null
  source: "property" | "entity"
  agentId: number | null
  agentName: string | null
  agentEmail: string | null
  ownerNum: number | null
  entityCategoryId: number | null
  association: string | null
}


function NoteChip({ note }: { note: AllNote }) {
  if (note.source === "property") {
    if (note.ownerNum != null) {
      return (
        <span
          className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
          data-testid={`property-notes-global-chip--owner-${note.ownerNum}`}
        >
          Owner {note.ownerNum}
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
        data-testid="property-notes-global-chip--property"
      >
        Property
      </span>
    )
  }

  const categoryId = note.entityCategoryId
  if (categoryId != null && CATEGORY_LABELS[categoryId]) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
        data-testid={`property-notes-global-chip--${CATEGORY_TESTIDS[categoryId]}`}
      >
        {CATEGORY_LABELS[categoryId]}
      </span>
    )
  }

  return null
}

export function PandaPropertiesFormNotesTab({ propertyListId }: { propertyListId: string | null }) {
  const [notes, setNotes] = useState<AllNote[] | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [search, setSearch] = useState("")
  const [refreshGen, setRefreshGen] = useState(0)
  const [addNoteOpen, setAddNoteOpen] = useState(false)

  useEffect(() => {
    if (!propertyListId) return
    setNotes(null)
    setFetchError(false)
    fetch(`/api/admin/properties/${propertyListId}/all-notes`)
      .then((r) => r.json())
      .then((data: AllNote[]) => setNotes(data))
      .catch(() => setFetchError(true))
  }, [propertyListId, refreshGen])

  const filtered =
    notes == null
      ? null
      : search.trim() === ""
        ? notes
        : notes.filter((n) => n.note.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label="Search notes"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="property-notes-global-search"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="property-notes-global-add-btn"
          onClick={() => setAddNoteOpen(true)}
          className="shrink-0"
        >
          <Plus className="mr-1 size-4" />
          Add Note
        </Button>
      </div>

      <PandaPropertiesAddNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        propertyListId={propertyListId}
        onSuccess={() => setRefreshGen((g) => g + 1)}
      />

      {fetchError ? (
        <p className="py-6 text-center text-sm text-destructive">
          Could not load notes. Please try again.
        </p>
      ) : filtered == null ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 && search.trim() !== "" ? (
        <p
          className="py-6 text-center text-sm text-muted-foreground"
          data-testid="property-notes-global-no-results"
        >
          No notes match your search.
        </p>
      ) : filtered.length === 0 ? (
        <div data-testid="property-notes-global-empty">
          <EmptyState message="No notes recorded for this property yet." />
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="property-notes-global-list">
          {filtered.map((note) => (
            <li
              key={`${note.source}-${note.noteId}`}
              className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-3 py-2"
              data-testid="property-notes-global-item"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <NoteChip note={note} />
                {note.entityName && (
                  <span className="text-xs font-medium text-foreground">{note.entityName}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(note.createdAt ? new Date(note.createdAt) : null)}
                </span>
              </div>
              <NoteExpandableText note={note.note} />
              {(note.agentName ?? note.createdBy) && (
                <span className="text-xs text-muted-foreground">
                  {note.agentName ?? note.createdBy}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
