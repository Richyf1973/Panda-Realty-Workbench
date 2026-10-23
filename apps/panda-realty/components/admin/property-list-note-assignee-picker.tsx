"use client"

import { useState } from "react"
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

export type Agent = { agentId: number; agentName: string; email: string | null }
export type Buyer = { propertyEntityId: number; entityName: string }

export type Assignee =
  | { type: "agent"; agentId: number; label: string }
  | { type: "buyer"; propertyEntityId: number; label: string }
  | null

interface NoteAssigneePickerProps {
  agents: Agent[]
  buyers: Buyer[]
  assignee: Assignee
  onChange: (assignee: Assignee) => void
  disabled: boolean
}

export function NoteAssigneePicker({
  agents,
  buyers,
  assignee,
  onChange,
  disabled,
}: NoteAssigneePickerProps) {
  const [open, setOpen] = useState(false)

  function select(next: Assignee) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="property-list-add-note-assignee-trigger"
        >
          <span className="truncate">{assignee?.label ?? "Agent or buyer…"}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => select(null)}>
                <Check
                  className={cn("mr-2 size-3", assignee === null ? "opacity-100" : "opacity-0")}
                />
                None
              </CommandItem>
            </CommandGroup>
            {agents.length > 0 && (
              <CommandGroup heading="Agents">
                {agents.map((agent) => (
                  <CommandItem
                    key={`agent-${agent.agentId}`}
                    value={`agent-${agent.agentName}`}
                    data-testid={`property-list-add-note-assignee-agent--${agent.agentId}`}
                    onSelect={() =>
                      select({ type: "agent", agentId: agent.agentId, label: agent.agentName })
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 size-3",
                        assignee?.type === "agent" && assignee.agentId === agent.agentId
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
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
                    data-testid={`property-list-add-note-assignee-buyer--${buyer.propertyEntityId}`}
                    onSelect={() =>
                      select({
                        type: "buyer",
                        propertyEntityId: buyer.propertyEntityId,
                        label: buyer.entityName,
                      })
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 size-3",
                        assignee?.type === "buyer" &&
                          assignee.propertyEntityId === buyer.propertyEntityId
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {buyer.entityName}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
