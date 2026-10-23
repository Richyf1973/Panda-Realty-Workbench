"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Plus, X } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"

import {
  addEntityBuyerRequirement,
  fetchAllBuyerRequirements,
  fetchEntityBuyerRequirements,
  removeEntityBuyerRequirement,
  updateEntityBuyerRequirementValue,
} from "@/app/admin/properties/board/buyer-requirements-actions"

type Requirement = {
  entityBuyerRequirementId: number
  buyerRequirementId: number
  requirement: string
  value: string | null
}

export function BuyerRequirementsPanel({ entityId }: { entityId: number }) {
  const [allRequirements, setAllRequirements] = useState<
    Array<{ buyerRequirementId: number; requirement: string }>
  >([])
  const [assigned, setAssigned] = useState<Requirement[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState("")

  function load() {
    void Promise.all([
      fetchAllBuyerRequirements(),
      fetchEntityBuyerRequirements(entityId),
    ]).then(([all, current]) => {
      setAllRequirements(all)
      setAssigned(current)
    })
  }

  useEffect(load, [entityId])

  const assignedIds = new Set(assigned.map((r) => r.buyerRequirementId))
  const unassigned = allRequirements.filter((r) => !assignedIds.has(r.buyerRequirementId))

  async function handleSelect(buyerRequirementId: number) {
    setPopoverOpen(false)
    await addEntityBuyerRequirement(entityId, buyerRequirementId)
    load()
  }

  async function handleRemove(entityBuyerRequirementId: number) {
    await removeEntityBuyerRequirement(entityBuyerRequirementId, entityId)
    load()
  }

  async function handleSaveValue(entityBuyerRequirementId: number) {
    setEditingId(null)
    await updateEntityBuyerRequirementValue(
      entityBuyerRequirementId,
      entityId,
      editingValue.trim() || null,
    )
    load()
  }

  return (
    <div>
      {assigned.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {assigned.map((r) => (
            <span
              key={r.entityBuyerRequirementId}
              data-testid={`buyer-req-pill--${r.entityBuyerRequirementId}`}
              className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {editingId === r.entityBuyerRequirementId ? (
                <span className="flex items-center gap-0.5">
                  <span className="text-muted-foreground">{r.requirement}:</span>
                  <input
                    autoFocus
                    data-testid={`buyer-req-value-input--${r.entityBuyerRequirementId}`}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => void handleSaveValue(r.entityBuyerRequirementId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveValue(r.entityBuyerRequirementId)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="w-14 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                    placeholder="value"
                  />
                </span>
              ) : (
                <button
                  data-testid={`buyer-req-value-btn--${r.entityBuyerRequirementId}`}
                  onClick={() => {
                    setEditingId(r.entityBuyerRequirementId)
                    setEditingValue(r.value ?? "")
                  }}
                  className="hover:text-muted-foreground"
                  title="Click to edit value"
                >
                  {r.requirement}
                  {r.value ? `: ${r.value}` : ""}
                </button>
              )}
              <button
                data-testid={`buyer-req-remove--${r.entityBuyerRequirementId}`}
                onClick={() => void handleRemove(r.entityBuyerRequirementId)}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${r.requirement}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              data-testid="buyer-req-add-trigger"
              className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
            >
              <Plus className="size-3" />
              Add requirement
              <ChevronDown className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search requirements…" className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                  No requirements found.
                </CommandEmpty>
                {unassigned.map((r) => (
                  <CommandItem
                    key={r.buyerRequirementId}
                    data-testid={`buyer-req-add-option--${r.buyerRequirementId}`}
                    value={r.requirement}
                    onSelect={() => void handleSelect(r.buyerRequirementId)}
                    className="cursor-pointer text-xs"
                  >
                    {r.requirement}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {assigned.length === 0 && unassigned.length === 0 && (
        <p className="text-sm text-muted-foreground">No requirements available.</p>
      )}
    </div>
  )
}
