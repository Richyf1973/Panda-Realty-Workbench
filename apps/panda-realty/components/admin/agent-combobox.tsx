"use client"

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

type AgentOption = { agentId: number; agentName: string }

interface AgentComboboxProps {
  agents: AgentOption[]
  agentId: number | null
  agentLabel: string | null
  onSelect: (agentId: number | null, agentLabel: string | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  triggerTestId?: string
  noneOptionTestId?: string
  optionTestId?: (agentId: number) => string
}

export function AgentCombobox({
  agents,
  agentId,
  agentLabel,
  onSelect,
  open,
  onOpenChange,
  disabled,
  triggerTestId,
  noneOptionTestId,
  optionTestId,
}: AgentComboboxProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-testid={triggerTestId}
          disabled={disabled}
          className="flex h-7 flex-1 items-center justify-between rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
                data-testid={noneOptionTestId}
                onSelect={() => { onSelect(null, null); onOpenChange(false) }}
              >
                <Check className={cn("mr-2 size-3", agentId === null ? "opacity-100" : "opacity-0")} />
                None
              </CommandItem>
              {agents.map((agent) => (
                <CommandItem
                  key={agent.agentId}
                  value={`agent-${agent.agentName}`}
                  data-testid={optionTestId?.(agent.agentId)}
                  onSelect={() => { onSelect(agent.agentId, agent.agentName); onOpenChange(false) }}
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
  )
}
