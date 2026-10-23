"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, XCircle } from "lucide-react"

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

import { addPropertyNote } from "@/app/admin/properties/board/add-note-action"

type Note = {
  propertyListNoteId: number
  note: string
  createdBy: string | null
  createdAt: string | null
  agentName: string | null
}

type SubmitState = "idle" | "submitting" | "error"

interface PropertyListOwnerNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyListId: number
  ownerNum: 1 | 2 | 3
  propertyLabel: string
}

export function PropertyListOwnerNotesDialog({
  open,
  onOpenChange,
  propertyListId,
  ownerNum,
  propertyLabel,
}: PropertyListOwnerNotesDialogProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}/notes?ownerNum=${ownerNum}`)
      if (res.ok) {
        const data = (await res.json()) as Note[]
        setNotes(data)
      }
    } finally {
      setLoading(false)
    }
  }, [propertyListId, ownerNum])

  useEffect(() => {
    if (open) void fetchNotes()
  }, [open, fetchNotes])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setNoteText("")
      setSubmitState("idle")
      setErrorMessage("")
    }
    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim() || submitState === "submitting") return

    setSubmitState("submitting")
    setErrorMessage("")

    const result = await addPropertyNote(propertyListId, noteText.trim(), null, null, ownerNum)

    if (result.success) {
      setNoteText("")
      setSubmitState("idle")
      await fetchNotes()
    } else {
      setErrorMessage(result.error ?? "Failed to add note")
      setSubmitState("error")
    }
  }

  const title = `Owner ${ownerNum} Notes${propertyLabel ? ` — ${propertyLabel}` : ""}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg"
        data-testid="property-owner-notes-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle data-testid="property-owner-notes-dialog-title">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : notes.length === 0 ? (
            <p
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              data-testid="property-owner-notes-empty"
            >
              No notes for this owner.
            </p>
          ) : (
            <div className="space-y-3" data-testid="property-owner-notes-list">
              {notes.map((note) => (
                <div key={note.propertyListNoteId} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {note.createdAt && (
                      <span>
                        {new Date(note.createdAt).toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {note.agentName && <span>· {note.agentName}</span>}
                    {!note.agentName && note.createdBy && (
                      <span className="text-muted-foreground/60">via {note.createdBy}</span>
                    )}
                  </div>
                  <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-foreground dark:border-blue-800 dark:bg-blue-950/30">
                    {note.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="shrink-0 border-t border-border px-6 py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Type a note…"
              disabled={submitState === "submitting"}
              data-testid="property-owner-notes-textarea"
            />
            {submitState === "error" && errorMessage && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" aria-hidden />
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 flex-row justify-between gap-2 border-t border-border bg-transparent px-6 py-4 sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={!noteText.trim() || submitState === "submitting"}
              data-testid="property-owner-notes-submit"
            >
              {submitState === "submitting" ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin shrink-0" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add Note"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
