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
import { cn } from "@repo/ui/utils"

import { NoteExpandableText } from "@/components/admin/panda-note-item"
import { addPropertyNote } from "./add-note-action"
import { EmptyState, formatDate } from "./panel-shared"
import type { PropertyDetailAgent, PropertyDetailBuyer, PropertyDetailNote } from "./property-types"

type Assignee =
  | { type: "agent"; agentId: number; label: string }
  | { type: "buyer"; propertyEntityId: number; label: string }
  | null

export function PropertyNotesTab({
  notes,
  propertyListId,
  onNoteAdded,
  agents,
  buyers,
}: {
  notes: PropertyDetailNote[]
  propertyListId: number | null
  onNoteAdded: () => void
  agents: PropertyDetailAgent[]
  buyers: PropertyDetailBuyer[]
}) {
  const [noteText, setNoteText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [buyerFilter, setBuyerFilter] = useState<string>("__all__")
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [assignee, setAssignee] = useState<Assignee>(null)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const buyerNames = Array.from(
    new Set(
      notes
        .filter((n) => n.entityName != null)
        .map((n) => n.entityName)
        .filter((n): n is string => n != null),
    ),
  ).sort()

  const visibleNotes =
    buyerFilter === "__all__" ? notes : notes.filter((n) => n.entityName === buyerFilter)

  const hasAssignees = agents.length > 0 || buyers.length > 0

  async function handleAddNote() {
    if (!noteText.trim() || submitting || propertyListId == null) return
    setSubmitting(true)
    setSubmitError(null)
    const agentId = assignee?.type === "agent" ? assignee.agentId : null
    const propertyEntityId = assignee?.type === "buyer" ? assignee.propertyEntityId : null
    const result = await addPropertyNote(propertyListId, noteText.trim(), agentId, propertyEntityId)
    if (result.success) {
      setNoteText("")
      setAssignee(null)
      onNoteAdded()
    } else {
      setSubmitError(result.error ?? "Failed to add note")
    }
    setSubmitting(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="space-y-4">
      {propertyListId != null ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type a note…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void handleAddNote()
              }
            }}
          />
          {hasAssignees && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">Assign to:</span>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <button
                    role="combobox"
                    aria-expanded={assigneeOpen}
                    className="flex h-7 flex-1 items-center justify-between rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <span className="truncate">{assignee?.label ?? "None"}</span>
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
                          onSelect={() => { setAssignee(null); setAssigneeOpen(false) }}
                        >
                          <Check className={cn("mr-2 size-3", assignee === null ? "opacity-100" : "opacity-0")} />
                          None
                        </CommandItem>
                      </CommandGroup>
                      {agents.length > 0 && (
                        <CommandGroup heading="Agents">
                          {agents.map((agent) => (
                            <CommandItem
                              key={`agent-${agent.agentId}`}
                              value={`agent-${agent.agentName}`}
                              onSelect={() => {
                                setAssignee({ type: "agent", agentId: agent.agentId, label: agent.agentName })
                                setAssigneeOpen(false)
                              }}
                            >
                              <Check className={cn("mr-2 size-3", assignee?.type === "agent" && assignee.agentId === agent.agentId ? "opacity-100" : "opacity-0")} />
                              {agent.agentName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {buyers.length > 0 && (
                        <CommandGroup heading="Buyers">
                          {buyers.map((buyer) => (
                            <CommandItem
                              key={`buyer-${buyer.propertyEntityId}`}
                              value={`buyer-${buyer.entityName}`}
                              onSelect={() => {
                                setAssignee({ type: "buyer", propertyEntityId: buyer.propertyEntityId, label: buyer.entityName })
                                setAssigneeOpen(false)
                              }}
                            >
                              <Check className={cn("mr-2 size-3", assignee?.type === "buyer" && assignee.propertyEntityId === buyer.propertyEntityId ? "opacity-100" : "opacity-0")} />
                              {buyer.entityName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
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
            <button
              onClick={() => void handleAddNote()}
              disabled={submitting || !noteText.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add Note"}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Unable to load property notes.
        </p>
      )}

      {buyerNames.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">Filter by buyer:</span>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <button
                role="combobox"
                aria-expanded={comboboxOpen}
                className="flex h-7 flex-1 items-center justify-between rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <span className="truncate">
                  {buyerFilter === "__all__" ? "All buyers" : buyerFilter}
                </span>
                <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search buyer…" className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty>No buyer found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__all__"
                      onSelect={() => { setBuyerFilter("__all__"); setComboboxOpen(false) }}
                    >
                      <Check className={cn("mr-2 size-3", buyerFilter === "__all__" ? "opacity-100" : "opacity-0")} />
                      All buyers
                    </CommandItem>
                    {buyerNames.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => { setBuyerFilter(name); setComboboxOpen(false) }}
                      >
                        <Check className={cn("mr-2 size-3", buyerFilter === name ? "opacity-100" : "opacity-0")} />
                        {name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {visibleNotes.length === 0 ? (
        <EmptyState message={buyerFilter === "__all__" ? "No notes yet." : "No notes for this buyer."} />
      ) : (
        <div className="space-y-3">
          {visibleNotes.map((note) => (
            <div key={`${note.source}-${note.noteId}`} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(note.createdAt)}</span>
                {note.entityName && <span>· {note.entityName}</span>}
                {note.agentName && <span>· {note.agentName}</span>}
                {(note.agentEmail ?? note.createdBy) && (
                  <span className="text-muted-foreground/60">via {note.agentEmail ?? note.createdBy}</span>
                )}
              </div>
              <div className={cn(
                "rounded-md px-3 py-2",
                note.source === "property"
                  ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                  : "bg-muted/50",
              )}>
                <NoteExpandableText note={note.note} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
