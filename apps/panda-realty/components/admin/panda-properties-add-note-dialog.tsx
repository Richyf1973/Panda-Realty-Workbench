"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@repo/ui/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"
import { Textarea } from "@repo/ui/textarea"
import { cn } from "@repo/ui/utils"

import { AgentCombobox } from "./agent-combobox"
import { useAgentOptions } from "./use-agent-options"
import { CATEGORY_LABELS } from "./property-notes-constants"

type PropertyEntity = {
  propertyEntityId: number
  entityName: string
  entityCategoryId: number
}

type SelectedEntity =
  | { type: "property" }
  | { type: "entity"; propertyEntityId: number; entityName: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyListId: string | null
  onSuccess: () => void
}

export function PandaPropertiesAddNoteDialog({ open, onOpenChange, propertyListId, onSuccess }: Props) {
  const [entities, setEntities] = useState<PropertyEntity[]>([])
  const [entitiesError, setEntitiesError] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedEntity | null>(null)

  const [noteText, setNoteText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const agents = useAgentOptions()
  const [agentId, setAgentId] = useState<number | null>(null)
  const [agentLabel, setAgentLabel] = useState<string | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)

  useEffect(() => {
    if (!open || !propertyListId) return
    setEntities([])
    setEntitiesError(false)
    fetch(`/api/admin/properties/${propertyListId}/entities`)
      .then((r) => r.json())
      .then((data: { items: PropertyEntity[] }) => setEntities(data.items ?? []))
      .catch(() => setEntitiesError(true))
  }, [open, propertyListId])

  function reset() {
    setSelected(null)
    setNoteText("")
    setAgentId(null)
    setAgentLabel(null)
    setSubmitError(null)
    setPickerOpen(false)
    setAgentOpen(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleSubmit() {
    if (!selected || !noteText.trim() || submitting || !propertyListId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const url =
        selected.type === "property"
          ? `/api/admin/properties/${propertyListId}/notes`
          : `/api/admin/property-entity-notes`

      const body =
        selected.type === "property"
          ? { note: noteText.trim(), agentId }
          : { propertyEntityId: selected.propertyEntityId, note: noteText.trim(), agentId }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setSubmitError(data.error ?? `Failed to add note (${res.status})`)
        return
      }
      reset()
      onOpenChange(false)
      onSuccess()
    } catch {
      setSubmitError("Failed to add note")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedLabel =
    selected == null
      ? null
      : selected.type === "property"
        ? "Property (general)"
        : selected.entityName

  const canSubmit = selected != null && noteText.trim().length > 0 && !submitting

  const grouped = useMemo(
    () =>
      entities.reduce<Record<number, PropertyEntity[]>>((acc, e) => {
        ;(acc[e.entityCategoryId] ??= []).push(e)
        return acc
      }, {}),
    [entities],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl flex flex-col gap-0 p-0"
        data-testid="property-notes-add-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Entity picker */}
          <div className="flex flex-col gap-1.5">
            <span id="property-notes-add-entity-label" className="text-sm font-medium">Entity</span>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  aria-labelledby="property-notes-add-entity-label"
                  data-testid="property-notes-add-entity-trigger"
                  disabled={submitting}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <span className={cn("truncate", selectedLabel == null && "text-muted-foreground")}>
                    {selectedLabel ?? "Select entity…"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command data-testid="property-notes-add-entity-dropdown">
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        value="property-general"
                        data-testid="property-notes-add-entity-option--property"
                        onSelect={() => {
                          setSelected({ type: "property" })
                          setPickerOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            selected?.type === "property" ? "opacity-100" : "opacity-0",
                          )}
                        />
                        Property (general)
                      </CommandItem>
                    </CommandGroup>
                    {entitiesError && (
                      <CommandEmpty>Could not load entities.</CommandEmpty>
                    )}
                    {Object.entries(grouped).map(([catId, items]) => (
                      <CommandGroup key={catId} heading={CATEGORY_LABELS[Number(catId)] ?? catId}>
                        {items.map((e) => (
                          <CommandItem
                            key={e.propertyEntityId}
                            value={`entity-${e.propertyEntityId}-${e.entityName}`}
                            data-testid={`property-notes-add-entity-option--${e.propertyEntityId}`}
                            onSelect={() => {
                              setSelected({ type: "entity", propertyEntityId: e.propertyEntityId, entityName: e.entityName })
                              setPickerOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                selected?.type === "entity" && selected.propertyEntityId === e.propertyEntityId
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {e.entityName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Note textarea */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Note</span>
            <Textarea
              data-testid="property-notes-add-textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type a note…"
              className="min-h-48"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
            />
          </div>

          {/* Agent picker */}
          {agents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">Assign to agent:</span>
              <AgentCombobox
                agents={agents}
                agentId={agentId}
                agentLabel={agentLabel}
                open={agentOpen}
                onOpenChange={setAgentOpen}
                disabled={submitting}
                onSelect={(id, label) => { setAgentId(id); setAgentLabel(label) }}
              />
            </div>
          )}

          {submitError && (
            <p className="text-xs text-destructive" data-testid="property-notes-add-error">
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border flex-row justify-between sm:justify-between gap-2 shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            data-testid="property-notes-add-submit"
            disabled={!canSubmit}
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
