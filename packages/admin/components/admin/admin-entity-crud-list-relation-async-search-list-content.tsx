"use client"

import * as React from "react"
import { useCommandState } from "@repo/ui/command"
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@repo/ui/command"
import { Skeleton } from "@repo/ui/skeleton"

/**
 * Rendered inside a `<Command>` tree. Writes cmdk's internally-tracked
 * highlighted value into a ref on every render so Tab-to-pick reads the
 * correct filtered match without creating a state-update loop.
 */
export function CommandListValueSync({
  highlightRef,
}: {
  highlightRef: React.MutableRefObject<string>
}) {
  const value = useCommandState((s) => s.value)
  // Write synchronously during render so the ref is up-to-date before a
  // Tab keydown handler reads it in the same frame.
  highlightRef.current = value ?? ""
  return null
}

export type AdminEntityAsyncSearchListContentProps = {
  isPreloaded: boolean
  isQueryingServerFromPreloadedSearch?: boolean
  relationPreloadPending?: boolean
  open: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  debouncedSearch: string
  hasScopedRelationFilters: boolean
  allowEmptySearchFetch: boolean
  options: readonly { value: string; label: string }[]
  popoverSearch: string
  showEmptyQueryHint: boolean
  compact: boolean
  onSelect: (value: string) => void
}

export function AdminEntityAsyncSearchListContent({
  isPreloaded,
  isQueryingServerFromPreloadedSearch,
  relationPreloadPending,
  open,
  isFetching,
  isError,
  error,
  debouncedSearch,
  hasScopedRelationFilters,
  allowEmptySearchFetch,
  options,
  popoverSearch,
  showEmptyQueryHint,
  compact,
  onSelect,
}: AdminEntityAsyncSearchListContentProps) {
  const showSkeleton =
    (isPreloaded && relationPreloadPending === true && open) ||
    (isQueryingServerFromPreloadedSearch === true &&
      open &&
      popoverSearch.trim() !== "" &&
      (debouncedSearch.trim() === "" || isFetching)) ||
    (!isPreloaded &&
      isFetching &&
      (debouncedSearch.trim() !== "" || hasScopedRelationFilters || allowEmptySearchFetch))

  if (showSkeleton) {
    return (
      <div className="flex flex-col gap-2 p-3" aria-busy>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (!isPreloaded && isError) {
    return (
      <p className="p-3 text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Could not load matches."}
      </p>
    )
  }

  if (
    open &&
    !isPreloaded &&
    popoverSearch.trim() === "" &&
    options.length === 0 &&
    !isFetching &&
    !hasScopedRelationFilters
  ) {
    return showEmptyQueryHint ? (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        Type to query the related list on the server.
      </div>
    ) : null
  }

  return (
    <>
      <CommandEmpty>No matches.</CommandEmpty>
      <CommandGroup>
        {options.map((o) => (
          <CommandItem
            key={o.value}
            value={o.value}
            keywords={[o.label]}
            onSelect={() => onSelect(o.value)}
            className={compact ? "text-xs" : undefined}
          >
            <span className="truncate">{o.label}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )
}
