"use client"

import * as React from "react"
import { ChevronDown, Eye, EyeOff, Star } from "lucide-react"

import {
  filterOptionsBySearch,
  RelationFilterSearchInput,
  type RelationFilterRowProps,
} from "./admin-entity-list-relation-filter-row-helpers"
import { Button } from "@repo/ui/button"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

// Handles the multiSelect variant of a relation filter row with per-option favorites and hide.
// Extracted as its own component so hooks are at the top level — not inside a conditional branch.
export function MultiSelectRelationFilterRow({
  slug,
  row,
  q,
  onQChange,
  collapsedEntry,
  onSetCollapsedEntry,
  onRelationMultiFilterChange,
}: Omit<RelationFilterRowProps, "onRelationFilterChange">) {
  const pk = row.persistenceKeys

  const [favorites, setFavorites] = React.useState<Set<string>>(() => {
    if (!pk || typeof window === "undefined") return new Set<string>()
    const stored = window.localStorage.getItem(pk.favorites)
    return stored ? new Set(stored.split(",").filter(Boolean)) : new Set<string>()
  })

  const [hidden, setHidden] = React.useState<Set<string>>(() => {
    if (!pk || typeof window === "undefined") return new Set<string>()
    const stored = window.localStorage.getItem(pk.hidden)
    return stored ? new Set(stored.split(",").filter(Boolean)) : new Set<string>()
  })

  const [showHidden, setShowHidden] = React.useState(false)

  React.useEffect(() => {
    if (!pk || typeof window === "undefined") return
    if (favorites.size === 0) {
      window.localStorage.removeItem(pk.favorites)
    } else {
      window.localStorage.setItem(pk.favorites, [...favorites].join(","))
    }
  }, [pk, favorites])

  React.useEffect(() => {
    if (!pk || typeof window === "undefined") return
    if (hidden.size === 0) {
      window.localStorage.removeItem(pk.hidden)
    } else {
      window.localStorage.setItem(pk.hidden, [...hidden].join(","))
    }
  }, [pk, hidden])

  const filtered = filterOptionsBySearch(row.options, q)
  const groupLabelId = `admin-entity-relation-filter-side-label--${slug}--${row.columnKey}`
  const searchId = `admin-entity-relation-filter-side-search--${slug}--${row.columnKey}`
  const selected = new Set(row.selectedValues)
  const hasActiveSelection = row.selectedValues.length > 0
  const isCollapsed = collapsedEntry === true
  const isExpanded = !isCollapsed

  // Snapshot of which ids are ticked, captured when the panel opens (initial mount + each
  // collapse→expand). The favorites group is ordered ticked-first from this snapshot; freezing
  // it while the panel stays open stops rows from jumping as the user ticks/unticks. It
  // re-settles only on the next open. No persistence — derives from the live selection at open.
  const [tickedSnapshot, setTickedSnapshot] = React.useState<Set<string>>(
    () => new Set(row.selectedValues),
  )
  const prevExpandedRef = React.useRef(isExpanded)
  React.useEffect(() => {
    const wasExpanded = prevExpandedRef.current
    prevExpandedRef.current = isExpanded
    if (isExpanded && !wasExpanded) {
      setTickedSnapshot(new Set(row.selectedValues))
    }
  }, [isExpanded, row.selectedValues])

  // Star and hide are independent. A starred item that is also hidden leaves the top
  // favorites section and lives in the hidden list, sorted above non-starred hidden items.
  // Within the favorites group, ticked options (per the open-time snapshot) sort first and
  // unticked ones drop to the bottom — stable within each partition, still above the divider.
  const favoritedAll = pk
    ? filtered.filter((o) => favorites.has(o.value) && !hidden.has(o.value))
    : []
  const favoritedFiltered = [
    ...favoritedAll.filter((o) => tickedSnapshot.has(o.value)),
    ...favoritedAll.filter((o) => !tickedSnapshot.has(o.value)),
  ]
  const hiddenOptions = pk ? filtered.filter((o) => hidden.has(o.value)) : []
  const hiddenFiltered = [
    ...hiddenOptions.filter((o) => favorites.has(o.value)),
    ...hiddenOptions.filter((o) => !favorites.has(o.value)),
  ]
  const visibleFiltered = pk
    ? filtered.filter((o) => !favorites.has(o.value) && !hidden.has(o.value))
    : filtered
  const selectableOptions = pk ? [...favoritedFiltered, ...visibleFiltered] : filtered

  // Plain render function (not a nested component) so option rows reconcile across
  // re-renders instead of remounting on every favorite/hide/select interaction.
  function renderOptionRow(o: { value: string; label: string }, isHiddenRow = false) {
    const checked = selected.has(o.value)
    return (
      <div key={o.value} className={cn("flex items-start gap-1", isHiddenRow && "opacity-50")}>
        <label className="flex flex-1 cursor-pointer items-start gap-2 text-sm leading-tight">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
            checked={checked}
            onChange={() => {
              const next = new Set(selected)
              if (checked) next.delete(o.value)
              else next.add(o.value)
              onRelationMultiFilterChange?.(row.columnKey, [...next].sort())
            }}
          />
          <span className="min-w-0 wrap-break-word">{o.label}</span>
        </label>
        {pk && (
          <div className="flex shrink-0 items-start gap-0.5 pt-0.5">
            <button
              type="button"
              data-testid={`admin-entity-list-relation-filter-option-star--${slug}--${row.columnKey}--${o.value}`}
              onClick={() => {
                // Star toggles favorites only — independent of hidden state.
                setFavorites((prev) => {
                  const next = new Set(prev)
                  if (next.has(o.value)) next.delete(o.value)
                  else next.add(o.value)
                  return next
                })
              }}
              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-amber-400"
              aria-label={favorites.has(o.value) ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={cn("size-3", favorites.has(o.value) && "fill-current text-amber-400")} />
            </button>
            <button
              type="button"
              data-testid={`admin-entity-list-relation-filter-option-hide--${slug}--${row.columnKey}--${o.value}`}
              onClick={() => {
                // Hide toggles hidden only — a starred item keeps its star when hidden.
                setHidden((prev) => {
                  const next = new Set(prev)
                  if (isHiddenRow) next.delete(o.value)
                  else next.add(o.value)
                  return next
                })
              }}
              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label={isHiddenRow ? "Unhide" : "Hide"}
            >
              {isHiddenRow ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex shrink-0 flex-col gap-2"
      data-testid={`admin-entity-list-relation-filter--${slug}--${row.columnKey}`}
    >
      <button
        type="button"
        onClick={() => onSetCollapsedEntry(row.columnKey, !isCollapsed)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        aria-expanded={isExpanded}
        aria-controls={groupLabelId}
        data-testid={`admin-entity-list-relation-filter-toggle--${slug}--${row.columnKey}`}
      >
        <span id={groupLabelId}>{row.columnLabel}</span>
        <span className="flex items-center gap-1.5">
          {!isExpanded && hasActiveSelection && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {row.selectedValues.length}
            </span>
          )}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </span>
      </button>
      {isExpanded && (
        <>
          <RelationFilterSearchInput
            id={searchId}
            value={q}
            onChange={(value) => onQChange(row.columnKey, value)}
            columnLabel={row.columnLabel}
            dataTestId={`admin-entity-list-relation-filter-search--${slug}--${row.columnKey}`}
          />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 justify-start px-2 text-muted-foreground hover:text-foreground"
              data-testid={`admin-entity-list-relation-filter-select-all--${slug}--${row.columnKey}`}
              onClick={() => {
                onRelationMultiFilterChange?.(
                  row.columnKey,
                  selectableOptions.map((o) => o.value),
                )
              }}
            >
              {q.trim() ? "Select visible" : "Select All"}
            </Button>
            {pk && favorites.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 justify-start px-2 text-muted-foreground hover:text-amber-400"
                data-testid={`admin-entity-list-relation-filter-select-favorites--${slug}--${row.columnKey}`}
                onClick={() => {
                  onRelationMultiFilterChange?.(
                    row.columnKey,
                    favoritedFiltered.map((o) => o.value),
                  )
                }}
              >
                Favorites only
              </Button>
            )}
          </div>
          <div
            className="scrollbar-galaxy flex max-h-52 min-h-18 flex-col gap-2 overflow-y-auto rounded-md border border-border/80 bg-background/80 p-2"
            role="group"
            aria-labelledby={groupLabelId}
          >
            {row.optionsPending && row.options.length === 0 ? (
              <div className="flex flex-col gap-2" aria-busy>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            ) : selectableOptions.length === 0 && hiddenFiltered.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matches.</p>
            ) : (
              <>
                {favoritedFiltered.map((o) => renderOptionRow(o))}
                {pk && favoritedFiltered.length > 0 && (visibleFiltered.length > 0 || hiddenFiltered.length > 0) && (
                  <div
                    data-testid={`admin-entity-list-relation-filter-favorites-divider--${slug}--${row.columnKey}`}
                    className="border-t border-border/50"
                  />
                )}
                {visibleFiltered.map((o) => renderOptionRow(o))}
                {pk && hiddenFiltered.length > 0 && (
                  <button
                    type="button"
                    data-testid={`admin-entity-list-relation-filter-show-hidden--${slug}--${row.columnKey}`}
                    onClick={() => setShowHidden((prev) => !prev)}
                    aria-expanded={showHidden}
                    className="text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    {`${showHidden ? "Hide" : "Show"} ${hiddenFiltered.length} hidden`}
                  </button>
                )}
                {pk && showHidden && hiddenFiltered.map((o) => renderOptionRow(o, true))}
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start px-2 text-muted-foreground hover:text-foreground"
            data-testid={`admin-entity-list-relation-filter-clear--${slug}--${row.columnKey}`}
            disabled={row.selectedValues.length === 0}
            onClick={() => {
              onRelationMultiFilterChange?.(row.columnKey, [])
              if (slug === "properties" && row.columnKey === "propertyStatusId") {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:values")
                  window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:collapsed")
                }
              }
            }}
          >
            Clear filter
          </Button>
        </>
      )}
    </div>
  )
}
