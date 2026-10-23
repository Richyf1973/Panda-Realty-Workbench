"use client"

import * as React from "react"
import { ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/command"
import { Label } from "@repo/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/popover"
import { cn } from "@repo/ui/utils"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"

type AdminEntityListRelationFilterMultiComboboxProps = {
  slug: AdminEntitySlug
  columnKey: string
  columnLabel: string
  options: readonly { value: string; label: string }[]
  selectedValues: readonly string[]
  optionsPending: boolean
  onValuesChange: (values: string[]) => void
  fullWidth?: boolean
  /** Match dense desktop list filter toolbar when not `fullWidth`. */
  denseDesktop?: boolean
}

function triggerSummary(
  options: readonly { value: string; label: string }[],
  selected: readonly string[],
): string {
  if (selected.length === 0) return "All"
  if (selected.length === 1) {
    const v = selected[0]!
    const hit = options.find((o) => o.value === v)
    return hit?.label ?? v
  }
  return `${selected.length} selected`
}

export function AdminEntityListRelationFilterMultiCombobox({
  slug,
  columnKey,
  columnLabel,
  options,
  selectedValues,
  optionsPending,
  onValuesChange,
  fullWidth = false,
  denseDesktop = false,
}: AdminEntityListRelationFilterMultiComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedSet = React.useMemo(
    () => new Set(selectedValues),
    [selectedValues],
  )
  const triggerId = `admin-entity-list-relation-filter--${slug}--${columnKey}`
  const summary = triggerSummary(options, selectedValues)

  return (
    <div
      className={cn(
        "flex min-w-40 flex-col",
        denseDesktop && !fullWidth ? "gap-1" : "gap-1.5",
      )}
    >
      <Label
        htmlFor={triggerId}
        className={cn(
          "font-normal text-muted-foreground",
          fullWidth || denseDesktop ? "text-xs" : "text-sm",
        )}
      >
        {columnLabel}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            size={fullWidth || denseDesktop ? "default" : "lg"}
            role="combobox"
            aria-expanded={open}
            aria-label={`Filter by ${columnLabel}`}
            disabled={optionsPending && options.length === 0}
            data-testid={`admin-entity-list-relation-filter--${slug}--${columnKey}`}
            className={cn(
              "justify-between font-normal",
              fullWidth
                ? "h-9 min-h-9 w-full min-w-0 text-sm"
                : denseDesktop
                  ? "h-8 min-h-8 min-w-40 text-xs"
                  : "min-w-40 text-sm",
              selectedValues.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">{summary}</span>
            <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="flex max-h-[min(85vh,26rem)] min-w-40 flex-col gap-0 overflow-hidden p-0"
          align="start"
        >
          <Command className="min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none">
            <CommandInput
              placeholder={`Search ${columnLabel.toLowerCase()}…`}
              autoComplete="off"
            />
            <CommandList className="max-h-none min-h-0 flex-1">
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const isOn = selectedSet.has(opt.value)
                  return (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.value} ${opt.label}`}
                      data-testid={`admin-entity-list-relation-filter--${slug}--${columnKey}--option--${opt.value}`}
                      onSelect={() => {
                        onValuesChange(
                          isOn
                            ? selectedValues.filter((v) => v !== opt.value)
                            : [...selectedValues, opt.value],
                        )
                      }}
                      data-checked={isOn ? true : undefined}
                    >
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="shrink-0 border-t border-border bg-popover p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full font-normal"
              aria-label={`Clear ${columnLabel} filter`}
              data-testid={`admin-entity-list-relation-filter-clear--${slug}--${columnKey}`}
              onClick={() => {
                onValuesChange([])
                setOpen(false)
              }}
            >
              Clear filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
