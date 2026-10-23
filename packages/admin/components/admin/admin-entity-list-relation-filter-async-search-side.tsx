"use client"

import * as React from "react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Skeleton } from "@repo/ui/skeleton"

export type AdminEntityListRelationFilterAsyncSearchSideProps = {
  testIdRoot: string
  parentSlug: string
  columnKey: string
  columnLabel: string
  value: string
  onValueChange: (next: string) => void
  hintEl: React.ReactNode
  showEmptyQueryHint: boolean
  sideSearch: string
  setSideSearch: (q: string) => void
  listQuery: {
    isFetching: boolean
    isError: boolean
    error: unknown
  }
  debouncedSearch: string
  options: readonly { value: string; label: string }[]
  selectedLabelQuery: { isPending: boolean; data: string | undefined }
}

export function AdminEntityListRelationFilterAsyncSearchSide({
  testIdRoot,
  parentSlug,
  columnKey,
  columnLabel,
  value,
  onValueChange,
  hintEl,
  showEmptyQueryHint,
  sideSearch,
  setSideSearch,
  listQuery,
  debouncedSearch,
  options,
  selectedLabelQuery,
}: AdminEntityListRelationFilterAsyncSearchSideProps) {
  return (
    <div
      className="flex min-h-0 flex-col gap-2"
      data-testid={testIdRoot}
    >
      <Label className="text-sm font-medium text-foreground">
        {columnLabel}
      </Label>
      {hintEl}
      {value.trim() !== "" ? (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedLabelQuery.isPending
              ? "…"
              : (selectedLabelQuery.data ?? value)}
          </span>
        </p>
      ) : null}
      <Input
        type="search"
        value={sideSearch}
        onChange={(e) => setSideSearch(e.target.value)}
        placeholder={`Search ${columnLabel.toLowerCase()}…`}
        autoComplete="off"
        className="h-8 text-sm"
        data-testid={`${testIdRoot}--search-input`}
        aria-label={`Search ${columnLabel} on server`}
      />
      <div
        className="scrollbar-galaxy flex max-h-52 min-h-18 flex-col gap-1 overflow-y-auto rounded-md border border-border/80 bg-background/80 p-1.5"
        role="listbox"
        aria-label={`${columnLabel} search results`}
      >
        {listQuery.isFetching && debouncedSearch.trim() !== "" ? (
          <div className="flex flex-col gap-2 p-1" aria-busy>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : listQuery.isError ? (
          <p className="px-2 py-1 text-xs text-destructive" role="alert">
            {listQuery.error instanceof Error
              ? listQuery.error.message
              : "Could not load matches."}
          </p>
        ) : debouncedSearch.trim() === "" ? (
          showEmptyQueryHint ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Type to search the related list.
            </p>
          ) : null
        ) : options.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">No matches.</p>
        ) : (
          <>
            <Button
              type="button"
              variant={value === "" ? "default" : "ghost"}
              size="sm"
              className="h-auto min-h-8 w-full justify-start px-2 py-1.5 text-left text-sm font-normal"
              data-testid={`${testIdRoot}--option--all`}
              onClick={() => onValueChange("")}
            >
              All
            </Button>
            {options.map((o) => (
              <Button
                key={o.value}
                type="button"
                variant={value === o.value ? "default" : "ghost"}
                size="sm"
                className="h-auto min-h-8 w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm font-normal"
                data-testid={`${testIdRoot}--option--${o.value}`}
                onClick={() => onValueChange(o.value)}
              >
                {o.label}
              </Button>
            ))}
          </>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 justify-start px-2 text-muted-foreground hover:text-foreground"
        data-testid={`admin-entity-list-relation-filter-clear--${parentSlug}--${columnKey}`}
        disabled={value.trim() === ""}
        onClick={() => onValueChange("")}
      >
        Clear filter
      </Button>
    </div>
  )
}
