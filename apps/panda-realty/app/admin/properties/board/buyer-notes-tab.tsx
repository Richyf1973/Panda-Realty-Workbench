"use client"

import { useRef, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"
import { Button } from "@repo/ui/button"
import { Textarea } from "@repo/ui/textarea"
import { cn } from "@repo/ui/utils"

import { addEntityNote } from "./add-entity-note-action"
import { EmptyState, formatDate } from "./panel-shared"
import type { BuyerPropertyEntry } from "./buyer-types"
import type { PropertyDetailAgent } from "./property-types"

export function BuyerNotesTab({
  notes,
  agents,
  propertyEntityId,
  onNoteAdded,
}: {
  notes: BuyerPropertyEntry["notes"]
  agents: PropertyDetailAgent[]
  propertyEntityId: number
  onNoteAdded: () => void
}) {
  const [noteText, setNoteText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentLabel, setAgentLabel] = useState<string | null>(null)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleAddNote() {
    if (!noteText.trim() || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await addEntityNote(propertyEntityId, noteText.trim(), agentId)
    if (result.success) {
      setNoteText("")
      setAgentId(null)
      setAgentLabel(null)
      onNoteAdded()
    } else {
      setSubmitError(result.error ?? "Failed to add note")
    }
    setSubmitting(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          data-testid="buyer-notes-textarea"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type a note…"
          rows={3}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void handleAddNote()
            }
          }}
        />

        {agents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">Assign to agent:</span>
            <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
              <PopoverTrigger asChild>
                <button
                  role="combobox"
                  aria-expanded={assigneeOpen}
                  data-testid="buyer-notes-assignee-trigger"
                  className="flex h-7 flex-1 items-center justify-between rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="truncate">{agentLabel ?? "None"}</span>
                  <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search…" className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        data-testid="buyer-notes-assignee-option--none"
                        onSelect={() => { setAgentId(null); setAgentLabel(null); setAssigneeOpen(false) }}
                      >
                        <Check className={cn("mr-2 size-3", agentId === null ? "opacity-100" : "opacity-0")} />
                        None
                      </CommandItem>
                      {agents.map((agent) => (
                        <CommandItem
                          key={agent.agentId}
                          value={`agent-${agent.agentName}`}
                          data-testid={`buyer-notes-assignee-option--${agent.agentId}`}
                          onSelect={() => {
                            setAgentId(agent.agentId)
                            setAgentLabel(agent.agentName)
                            setAssigneeOpen(false)
                          }}
                        >
                          <Check className={cn("mr-2 size-3", agentId === agent.agentId ? "opacity-100" : "opacity-0")} />
                          {agent.agentName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex items-center justify-between">
          {submitError ? (
            <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Ctrl+Enter to submit</p>
          )}
          <Button
            size="sm"
            data-testid="buyer-notes-submit"
            onClick={() => void handleAddNote()}
            disabled={submitting || !noteText.trim()}
          >
            {submitting ? "Adding…" : "Add Note"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState message="No notes yet." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.propertyEntityNoteId} data-testid={`buyer-note-row--${note.propertyEntityNoteId}`} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(note.createdAt)}</span>
                {note.agentName && <span data-testid={`buyer-note-agent--${note.propertyEntityNoteId}`}>· {note.agentName}</span>}
                {note.createdBy && <span className="text-muted-foreground/60">via {note.createdBy}</span>}
              </div>
              <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
                {note.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
