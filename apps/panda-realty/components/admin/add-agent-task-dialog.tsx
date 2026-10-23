"use client"

import { useId, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"
import { Textarea } from "@repo/ui/textarea"

import { useAgentOptions } from "./use-agent-options"

type SubmitState = "idle" | "submitting" | "success" | "error"

interface AddAgentTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddAgentTaskDialog({ open, onOpenChange, onSuccess }: AddAgentTaskDialogProps) {
  const agentId = useId()
  const titleId = useId()
  const dueDateId = useId()
  const notesId = useId()

  const agents = useAgentOptions()
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  function resetForm() {
    setSelectedAgentId("")
    setTitle("")
    setDueDate("")
    setNotes("")
    setSubmitState("idle")
    setErrorMessage("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const selectedAgent = agents.find((a) => String(a.agentId) === selectedAgentId) ?? null
  const agentHasNoEmail = selectedAgent !== null && !selectedAgent.email

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitState === "submitting") return

    setSubmitState("submitting")
    setErrorMessage("")

    try {
      const res = await fetch("/api/admin/calendar/agent-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: Number(selectedAgentId),
          title: title.trim(),
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }

      setSubmitState("success")
      onSuccess()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create task")
      setSubmitState("error")
    }
  }

  const isSubmitting = submitState === "submitting"
  const isSuccess = submitState === "success"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md flex flex-col gap-0 p-0"
        data-testid="add-agent-task-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Add Task for Agent</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={agentId}>
                Agent <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={isSubmitting || isSuccess}
                required
              >
                <SelectTrigger
                  id={agentId}
                  data-testid="add-agent-task-agent"
                >
                  <SelectValue placeholder="Select agent…" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.agentId} value={String(a.agentId)}>
                      {a.agentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agentHasNoEmail && (
                <p
                  className="flex items-center gap-1.5 text-xs text-amber-600"
                  data-testid="add-agent-task-no-email-warning"
                >
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  no email — notification won&apos;t be sent
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={titleId}>
                Task title <span className="text-destructive">*</span>
              </Label>
              <Input
                id={titleId}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoComplete="off"
                disabled={isSubmitting || isSuccess}
                data-testid="add-agent-task-title"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={dueDateId}>Due date</Label>
              <Input
                id={dueDateId}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting || isSuccess}
                data-testid="add-agent-task-due-date"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={notesId}>Notes</Label>
              <Textarea
                id={notesId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isSubmitting || isSuccess}
                data-testid="add-agent-task-notes"
              />
            </div>

            {isSuccess && (
              <p
                className="flex items-center gap-1.5 text-sm text-green-600"
                data-testid="add-agent-task-success"
              >
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Task created — close the dialog when done.
              </p>
            )}

            {submitState === "error" && errorMessage && (
              <p
                className="flex items-center gap-1.5 text-sm text-destructive"
                data-testid="add-agent-task-error"
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
              disabled={isSubmitting || isSuccess || !selectedAgentId}
              data-testid="add-agent-task-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin shrink-0" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
