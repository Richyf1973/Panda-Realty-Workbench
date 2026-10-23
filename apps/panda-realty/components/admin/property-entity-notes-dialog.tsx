"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { Textarea } from "@repo/ui/textarea"

import { AgentCombobox } from "./agent-combobox"
import { useAgentOptions } from "./use-agent-options"

type Note = {
  propertyEntityNoteId: number
  note: string
  createdBy: string | null
  createdAt: string | null
  agentName: string | null
}

interface PropertyEntityNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyEntityId: number | null
  entityName: string
}

export function PropertyEntityNotesDialog({
  open,
  onOpenChange,
  propertyEntityId,
  entityName,
}: PropertyEntityNotesDialogProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)

  const [noteText, setNoteText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const agents = useAgentOptions()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentLabel, setAgentLabel] = useState<string | null>(null)
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  const loadNotes = useCallback(async () => {
    if (propertyEntityId == null) return
    setNotesLoading(true)
    setNotesError(null)
    try {
      const res = await fetch(`/api/admin/property-entity-notes?propertyEntityId=${propertyEntityId}`)
      if (!res.ok) {
        setNotesError("Failed to load notes")
        return
      }
      const data = (await res.json()) as Note[]
      setNotes(data)
    } catch {
      setNotesError("Failed to load notes")
    } finally {
      setNotesLoading(false)
    }
  }, [propertyEntityId])

  useEffect(() => {
    if (open && propertyEntityId != null) {
      void loadNotes()
    }
  }, [open, propertyEntityId, loadNotes])

  function resetForm() {
    setNoteText("")
    setAgentId(null)
    setAgentLabel(null)
    setSubmitError(null)
    setAssigneeOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm()
      setNotes([])
      setNotesError(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    if (!noteText.trim() || submitting || propertyEntityId == null) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/admin/property-entity-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId, note: noteText.trim(), agentId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setSubmitError(data.error ?? `Failed to add note (${res.status})`)
        return
      }
      setNoteText("")
      setAgentId(null)
      setAgentLabel(null)
      await loadNotes()
    } catch {
      setSubmitError("Failed to add note")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[85vh]"
        data-testid="property-entity-notes-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle data-testid="property-entity-notes-dialog-title">
            Notes — {entityName}
          </DialogTitle>
        </DialogHeader>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[8rem] max-h-72">
          {notesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notesError ? (
            <p className="text-sm text-destructive">{notesError}</p>
          ) : notes.length === 0 ? (
            <p
              className="text-sm text-muted-foreground text-center py-4"
              data-testid="property-entity-notes-empty"
            >
              No notes yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3" data-testid="property-entity-notes-list">
              {notes.map((n) => (
                <li
                  key={n.propertyEntityNoteId}
                  className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-AU") : ""}
                    {(n.agentName ?? n.createdBy) && (
                      <> · {n.agentName ?? n.createdBy}</>
                    )}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add note form */}
        <div className="border-t border-border px-6 py-4 flex flex-col gap-3 shrink-0">
          <Textarea
            data-testid="property-entity-notes-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type a note…"
            rows={5}
            className="resize-none"
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void handleSubmit()
              }
            }}
          />

          {agents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">Assign to agent:</span>
              <AgentCombobox
                agents={agents}
                agentId={agentId}
                agentLabel={agentLabel}
                open={assigneeOpen}
                onOpenChange={setAssigneeOpen}
                disabled={submitting}
                triggerTestId="property-entity-notes-assignee-trigger"
                onSelect={(id, label) => { setAgentId(id); setAgentLabel(label) }}
              />
            </div>
          )}

          {submitError && (
            <p className="text-xs text-destructive">{submitError}</p>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-border bg-transparent flex-row justify-between sm:justify-between gap-2 shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            data-testid="property-entity-notes-submit"
            disabled={submitting || !noteText.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin shrink-0" aria-hidden />
                Adding…
              </>
            ) : (
              "Add Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
