"use client"

import { useState } from "react"
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

interface AddBuyerNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyEntityId: number
  onSuccess: () => void
}

export function AddBuyerNoteDialog({
  open,
  onOpenChange,
  propertyEntityId,
  onSuccess,
}: AddBuyerNoteDialogProps) {
  const [noteText, setNoteText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const agents = useAgentOptions()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentLabel, setAgentLabel] = useState<string | null>(null)
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  function resetForm() {
    setNoteText("")
    setAgentId(null)
    setAgentLabel(null)
    setSubmitError(null)
    setAssigneeOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    if (!noteText.trim() || submitting) return
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
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch {
      setSubmitError("Failed to add note")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md flex flex-col gap-0 p-0"
        data-testid="buyer-row-add-note-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4">
          <Textarea
            data-testid="buyer-row-add-note-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type a note…"
            rows={3}
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
                triggerTestId="buyer-row-add-note-assignee-trigger"
                noneOptionTestId="buyer-row-add-note-assignee-option--none"
                optionTestId={(id) => `buyer-row-add-note-assignee-option--${id}`}
                onSelect={(id, label) => { setAgentId(id); setAgentLabel(label) }}
              />
            </div>
          )}

          {submitError && (
            <p className="text-xs text-destructive">{submitError}</p>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-border bg-transparent flex-row justify-between sm:justify-between gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            data-testid="buyer-row-add-note-submit"
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
