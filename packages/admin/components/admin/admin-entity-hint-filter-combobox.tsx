"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"

type HintFilterComboboxProps = {
  options: readonly { value: string; label: string }[]
  currentValue: string
  allLabel: string
  groupLabel: string
  queryParam: string
  currentValueDisplay?: "first-segment"
  groupLabelId: string
  onHintFilterChange?: (queryParam: string, value: string) => void
}

export function HintFilterCombobox({
  options,
  currentValue,
  allLabel,
  groupLabel,
  queryParam,
  currentValueDisplay,
  groupLabelId,
  onHintFilterChange,
}: HintFilterComboboxProps) {
  const [comboOpen, setComboOpen] = React.useState(false)

  const currentLabel = (() => {
    if (currentValue === "") return allLabel
    const matched = options.find((o) => o.value === currentValue)?.label
    if (matched) return matched
    if (currentValueDisplay === "first-segment") {
      return currentValue
        .split(",")
        .map((entry) => entry.split("~")[0]?.trim() ?? entry)
        .filter(Boolean)
        .join(", ")
    }
    return currentValue
  })()

  return (
    <Popover open={comboOpen} onOpenChange={setComboOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={comboOpen}
          aria-labelledby={groupLabelId}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${groupLabel.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={allLabel}
                data-checked={currentValue === ""}
                onSelect={() => {
                  onHintFilterChange?.(queryParam, "")
                  setComboOpen(false)
                }}
              >
                {allLabel}
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  data-checked={currentValue === opt.value}
                  onSelect={() => {
                    onHintFilterChange?.(queryParam, opt.value)
                    setComboOpen(false)
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
