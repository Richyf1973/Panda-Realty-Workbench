"use client"

import { useEffect, useId, useState } from "react"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { Label } from "@repo/ui/label"
import { Textarea } from "@repo/ui/textarea"

import { addPropertyNote } from "@/app/admin/properties/board/add-note-action"

import { type Agent, type Assignee, type Buyer, NoteAssigneePicker } from "./property-list-note-assignee-picker"

type SubmitState = "idle" | "submitting" | "success" | "error"

interface PropertyListAddNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyListId: number
  propertyLabel: string
  subtitleOverride?: string
  ownerNum?: number
}

export function PropertyListAddNoteDialog({
  open,
  onOpenChange,
  propertyListId,
  propertyLabel,
  subtitleOverride,
  ownerNum,
}: PropertyListAddNoteDialogProps) {
  const noteId = useId()

  const [note, setNote] = useState("")
  const [assignee, setAssignee] = useState<Assignee>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [assigneesLoadError, setAssigneesLoadError] = useState(false)

  useEffect(() => {
    if (!open) return
    void fetchAssignees()
  }, [open, propertyListId])

  async function fetchAssignees() {
    try {
      const [agentsRes, propertyRes] = await Promise.all([
        fetch("/api/admin/agents/options"),
        fetch(`/api/admin/properties/${propertyListId}`),
      ])
      if (agentsRes.ok) {
        const data = (await agentsRes.json()) as Agent[]
        setAgents(data)
      }
      if (propertyRes.ok) {
        const data = (await propertyRes.json()) as {
          propertyBuyers?: { propertyEntityId: number; propertyEntity?: { entityName?: string } }[]
        }
        const buyerRows = (data.propertyBuyers ?? [])
          .map((b) => ({
            propertyEntityId: b.propertyEntityId,
            entityName: b.propertyEntity?.entityName ?? "",
          }))
          .filter((b) => b.entityName)
        setBuyers(buyerRows as Buyer[])
      }
    } catch {
      setAssigneesLoadError(true)
    }
  }

  function resetForm() {
    setNote("")
    setAssignee(null)
    setSubmitState("idle")
    setErrorMessage("")
    setAssigneesLoadError(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitState === "submitting" || !note.trim()) return

    setSubmitState("submitting")
    setErrorMessage("")

    const agentId = assignee?.type === "agent" ? assignee.agentId : null
    const propertyEntityId = assignee?.type === "buyer" ? assignee.propertyEntityId : null

    const result = await addPropertyNote(propertyListId, note.trim(), agentId, propertyEntityId, ownerNum ?? null)

    if (result.success) {
      setSubmitState("success")
    } else {
      setErrorMessage(result.error ?? "Failed to add note")
      setSubmitState("error")
    }
  }

  const isSubmitting = submitState === "submitting"
  const isSuccess = submitState === "success"
  const hasAssignees = agents.length > 0 || buyers.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md flex flex-col gap-0 p-0"
        data-testid="property-list-add-note-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Add Note</DialogTitle>
          <p
            className="text-sm text-muted-foreground mt-0.5"
            data-testid="property-list-add-note-subtitle"
          >
            {subtitleOverride ?? propertyLabel}
          </p>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={noteId}>
                Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={noteId}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                required
                placeholder="Type a note…"
                disabled={isSubmitting || isSuccess}
                data-testid="property-list-add-note-textarea"
              />
            </div>

            {assigneesLoadError && !isSuccess && (
              <div className="grid gap-1.5">
                <Label>Assign to (optional)</Label>
                <p className="text-sm text-muted-foreground">Could not load assignees.</p>
              </div>
            )}

            {!assigneesLoadError && hasAssignees && (
              <div className="grid gap-1.5">
                <Label>Assign to (optional)</Label>
                <NoteAssigneePicker
                  agents={agents}
                  buyers={buyers}
                  assignee={assignee}
                  onChange={setAssignee}
                  disabled={isSubmitting || isSuccess}
                />
              </div>
            )}

            {isSuccess && (
              <p
                className="flex items-center gap-1.5 text-sm text-green-600"
                data-testid="property-list-add-note-success"
              >
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Note added — close the dialog when done.
              </p>
            )}

            {submitState === "error" && errorMessage && (
              <p
                className="flex items-center gap-1.5 text-sm text-destructive"
                data-testid="property-list-add-note-error"
              >
                <XCircle className="size-4 shrink-0" aria-hidden />
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-border bg-transparent flex-row justify-between sm:justify-between gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isSuccess}
              data-testid="property-list-add-note-submit"
            >
              {isSubmitting ? (
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
