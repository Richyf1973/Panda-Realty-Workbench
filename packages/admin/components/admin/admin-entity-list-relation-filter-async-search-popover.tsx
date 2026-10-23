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
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

export type AdminEntityListRelationFilterAsyncSearchPopoverProps = {
  testIdRoot: string
  parentSlug: string
  columnKey: string
  columnLabel: string
  value: string
  onValueChange: (next: string) => void
  hintEl: React.ReactNode
  fullWidth: boolean
  denseDesktop: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  popoverSearch: string
  onPopoverSearchChange: (q: string) => void
  listQuery: {
    isFetching: boolean
    isError: boolean
    error: unknown
  }
  debouncedPopoverSearch: string
  options: readonly { value: string; label: string }[]
  showEmptyQueryHint: boolean
  triggerSummary: string
  triggerId: string
  setOpen: (open: boolean) => void
  setPopoverSearch: (q: string) => void
}

export function AdminEntityListRelationFilterAsyncSearchPopover(
  p: AdminEntityListRelationFilterAsyncSearchPopoverProps,
) {
  const {
    testIdRoot,
    parentSlug,
    columnKey,
    columnLabel,
    value,
    onValueChange,
    hintEl,
    fullWidth,
    denseDesktop,
    open,
    onOpenChange,
    popoverSearch,
    onPopoverSearchChange,
    listQuery,
    debouncedPopoverSearch,
    options,
    showEmptyQueryHint,
    triggerSummary,
    triggerId,
    setOpen,
    setPopoverSearch,
  } = p
  return (
    <div
      className={cn(
        "flex flex-col",
        fullWidth
          ? "w-full min-w-0 max-w-none"
          : "min-w-[min(100%,18rem)] max-w-md",
        denseDesktop && !fullWidth ? "gap-1" : "gap-1.5",
      )}
      data-testid={testIdRoot}
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
      {hintEl}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            type="button"
            variant="outline"
            size={fullWidth || denseDesktop ? "default" : "lg"}
            role="combobox"
            aria-expanded={open}
            aria-label={`Filter by ${columnLabel}`}
            data-testid={triggerId}
            className={cn(
              "justify-between font-normal",
              fullWidth
                ? "h-9 min-h-9 w-full min-w-0 text-sm"
                : denseDesktop
                  ? "h-8 min-h-8 min-w-40 text-xs"
                  : "min-w-40 text-sm",
              value.trim() === "" && "text-muted-foreground",
            )}
          >
            <span className="truncate">{triggerSummary}</span>
            <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="flex max-h-[min(85vh,26rem)] w-[min(100vw-2rem,24rem)] flex-col gap-0 overflow-hidden p-0"
          align="start"
        >
          <Command shouldFilter={false} className="rounded-none border-0 bg-transparent">
            <CommandInput
              placeholder={`Type to search (${columnLabel.toLowerCase()})…`}
              value={popoverSearch}
              onValueChange={onPopoverSearchChange}
              data-testid={`${testIdRoot}--search-input`}
              autoComplete="off"
            />
            <CommandList className="max-h-60">
              {listQuery.isFetching && debouncedPopoverSearch.trim() !== "" ? (
                <div className="flex flex-col gap-2 p-3" aria-busy>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : listQuery.isError ? (
                <p className="p-3 text-sm text-destructive" role="alert">
                  {listQuery.error instanceof Error
                    ? listQuery.error.message
                    : "Could not load matches."}
                </p>
              ) : debouncedPopoverSearch.trim() === "" ? (
                showEmptyQueryHint ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Type to query the related list on the server.
                  </div>
                ) : null
              ) : options.length === 0 ? (
                <CommandEmpty>No matches.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem
                      key={o.value}
                      value={`${o.value} ${o.label}`}
                      data-testid={`${testIdRoot}--option--${o.value}`}
                      onSelect={() => {
                        onValueChange(o.value)
                        setOpen(false)
                        setPopoverSearch("")
                      }}
                    >
                      <span className="truncate">{o.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          <div className="shrink-0 border-t border-border bg-popover p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full font-normal"
              aria-label={`Clear ${columnLabel} filter`}
              data-testid={`admin-entity-list-relation-filter-clear--${parentSlug}--${columnKey}`}
              disabled={value.trim() === ""}
              onClick={() => {
                onValueChange("")
                setOpen(false)
                setPopoverSearch("")
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
