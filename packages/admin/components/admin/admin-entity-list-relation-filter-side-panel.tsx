"use client"

import * as React from "react"
import { ChevronDown, Search } from "lucide-react"

import { AdminEntityListRelationFilterAsyncSearch } from "./admin-entity-list-relation-filter-async-search"
import { HintFilterSidePanelSection } from "./admin-entity-hint-filter-section"
import { MultiSelectRelationFilterRow } from "./admin-entity-list-relation-filter-multiselect-row"
import {
  filterOptionsBySearch,
  RelationFilterSearchInput,
  type RelationFilterRowProps,
} from "./admin-entity-list-relation-filter-row-helpers"
import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type { AdminEntityListAppendWhereHintFilter } from "../../admin-entity-types"
import { Button } from "@repo/ui/button"
import { ButtonGroup } from "@repo/ui/button-group"
import { Switch } from "@repo/ui/switch"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { ListBooleanFilterSegment } from "../../admin-entity-list-filter-summary"

function RelationFilterRow({
  slug,
  row,
  q,
  onQChange,
  collapsedEntry,
  onSetCollapsedEntry,
  onRelationFilterChange,
  onRelationMultiFilterChange,
}: RelationFilterRowProps) {
  if (row.uiVariant === "asyncSearch" && row.relatedSlug != null) {
    return (
      <AdminEntityListRelationFilterAsyncSearch
        parentSlug={slug}
        columnKey={row.columnKey}
        columnLabel={row.columnLabel}
        value={row.value}
        onValueChange={(v) => onRelationFilterChange?.(row.columnKey, v)}
        relatedSlug={row.relatedSlug}
        labelColumnKeys={row.relatedListLabelColumnKeys ?? []}
        matchesHint={row.asyncSearchMatchesHint}
        showDerivedMatchesHint={row.asyncSearchShowMatchesHint === true}
        fetchLimit={row.asyncSearchFetchLimit ?? 50}
        layout="side"
        showEmptyQueryHint={row.asyncSearchShowEmptyQueryHint === true}
      />
    )
  }

  const filtered = filterOptionsBySearch(row.options, q)
  const groupLabelId = `admin-entity-relation-filter-side-label--${slug}--${row.columnKey}`
  const searchId = `admin-entity-relation-filter-side-search--${slug}--${row.columnKey}`

  if (row.multiSelect) {
    return (
      <MultiSelectRelationFilterRow
        slug={slug}
        row={row}
        q={q}
        onQChange={onQChange}
        collapsedEntry={collapsedEntry}
        onSetCollapsedEntry={onSetCollapsedEntry}
        onRelationMultiFilterChange={onRelationMultiFilterChange}
      />
    )
  }

  const selectedValue = row.value === "" ? "__all__" : row.value
  const hasActiveSelection = row.value !== ""
  const isExpanded = collapsedEntry ?? hasActiveSelection
  return (
    <div
      className="flex shrink-0 flex-col gap-2"
      data-testid={`admin-entity-list-relation-filter--${slug}--${row.columnKey}`}
    >
      <button
        type="button"
        onClick={() => onSetCollapsedEntry(row.columnKey, !isExpanded)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        aria-expanded={isExpanded}
        aria-controls={groupLabelId}
      >
        <span id={groupLabelId}>{row.columnLabel}</span>
        <span className="flex items-center gap-1.5">
          {!isExpanded && hasActiveSelection && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              1
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
          <div
            className="scrollbar-galaxy flex max-h-52 min-h-18 flex-col gap-1 overflow-y-auto rounded-md border border-border/80 bg-background/80 p-1.5"
            role="radiogroup"
            aria-labelledby={groupLabelId}
          >
            {row.optionsPending && row.options.length === 0 ? (
              <div className="flex flex-col gap-2 p-1" aria-busy>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  role="radio"
                  variant={selectedValue === "__all__" ? "default" : "ghost"}
                  size="sm"
                  aria-checked={selectedValue === "__all__"}
                  className="h-auto min-h-8 w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm font-normal"
                  onClick={() => onRelationFilterChange?.(row.columnKey, "")}
                >
                  All
                </Button>
                {filtered.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    No matches.
                  </p>
                ) : (
                  filtered.map((o) => (
                    <Button
                      key={o.value}
                      type="button"
                      role="radio"
                      variant={selectedValue === o.value ? "default" : "ghost"}
                      size="sm"
                      aria-checked={selectedValue === o.value}
                      className="h-auto min-h-8 w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm font-normal"
                      onClick={() =>
                        onRelationFilterChange?.(row.columnKey, o.value)
                      }
                    >
                      {o.label}
                    </Button>
                  ))
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

type AdminEntityListRelationFilterSidePanelProps = {
  slug: AdminEntitySlug
  rows: readonly AdminEntityListRelationFilterRow[]
  hintFilterSpecs?: readonly AdminEntityListAppendWhereHintFilter[]
  hintFilterSegments?: Record<string, string>
  onHintFilterChange?: (queryParam: string, value: string) => void
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
  searchEnabled?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchTrigger?: "debounce" | "submit"
  onSearchSubmit?: (value?: string) => void
  onSearchClear?: () => void
  searchPlaceholder?: string
  booleanFilter?: { all: string; true: string; false: string }
  booleanFilterGroupLabel?: string
  booleanFilterUiStyle?: "switch"
  booleanFilterSegment?: ListBooleanFilterSegment
  onBooleanFilterChange?: (value: ListBooleanFilterSegment) => void
  onClearAllFilters?: () => void
  clearFiltersDisabled?: boolean
}

export function AdminEntityListRelationFilterSidePanel({
  slug,
  rows,
  hintFilterSpecs,
  hintFilterSegments,
  onHintFilterChange,
  onRelationFilterChange,
  onRelationMultiFilterChange,
  searchEnabled,
  searchValue = "",
  onSearchChange,
  searchTrigger = "debounce",
  onSearchSubmit,
  onSearchClear,
  searchPlaceholder = "Search",
  booleanFilter,
  booleanFilterGroupLabel = "Filter",
  booleanFilterUiStyle,
  booleanFilterSegment = "all",
  onBooleanFilterChange,
  onClearAllFilters,
  clearFiltersDisabled = true,
}: AdminEntityListRelationFilterSidePanelProps) {
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue)
  React.useEffect(() => {
    setLocalSearchValue(searchValue)
  }, [searchValue])
  const debounceSearchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    return () => {
      if (debounceSearchRef.current !== null) clearTimeout(debounceSearchRef.current)
    }
  }, [])

  const [searchByKey, setSearchByKey] = React.useState<Record<string, string>>(
    {},
  )
  const [collapsedByKey, setCollapsedByKey] = React.useState<
    Record<string, boolean>
  >(() => {
    // Panda Realty: restore collapsed state for Status filter from localStorage
    if (
      slug === "properties" &&
      typeof window !== "undefined"
    ) {
      const collapsed = window.localStorage.getItem(
        "panda-realty:list-filter:properties:propertyStatusId:collapsed",
      )
      if (collapsed === "1") {
        return { propertyStatusId: true } as Record<string, boolean>
      }
    }
    return {} as Record<string, boolean>
  })
  const [collapseGroupExpanded, setCollapseGroupExpanded] = React.useState<Record<string, boolean>>({})

  // Panda Realty: persist collapsed state to localStorage
  React.useEffect(() => {
    if (slug === "properties" && typeof window !== "undefined") {
      if (collapsedByKey.propertyStatusId) {
        window.localStorage.setItem(
          "panda-realty:list-filter:properties:propertyStatusId:collapsed",
          "1",
        )
      } else {
        window.localStorage.removeItem(
          "panda-realty:list-filter:properties:propertyStatusId:collapsed",
        )
      }
    }
  }, [slug, collapsedByKey.propertyStatusId])

  const topHintFilters = hintFilterSpecs?.filter((s) => s.uiPosition === "top") ?? []
  const normalHintFilters = hintFilterSpecs?.filter((s) => s.uiPosition !== "top") ?? []

  // Build an ordered list of render items for normalHintFilters:
  // each item is either a single ungrouped filter or a named collapse group (first occurrence wins position).
  type RenderItem =
    | { kind: "filter"; spec: AdminEntityListAppendWhereHintFilter }
    | { kind: "group"; groupName: string; specs: AdminEntityListAppendWhereHintFilter[] }
  const seenGroups = new Set<string>()
  const collapseGroupMap: Record<string, AdminEntityListAppendWhereHintFilter[]> = {}
  for (const spec of normalHintFilters) {
    if (spec.collapseGroup) {
      if (!collapseGroupMap[spec.collapseGroup]) collapseGroupMap[spec.collapseGroup] = []
      collapseGroupMap[spec.collapseGroup]!.push(spec)
    }
  }
  const normalRenderItems: RenderItem[] = normalHintFilters.flatMap<RenderItem>((spec) => {
    if (!spec.collapseGroup) return [{ kind: "filter" as const, spec }]
    if (seenGroups.has(spec.collapseGroup)) return []
    seenGroups.add(spec.collapseGroup)
    return [{ kind: "group" as const, groupName: spec.collapseGroup, specs: collapseGroupMap[spec.collapseGroup]! }]
  })

  return (
    <aside
      className="scrollbar-galaxy relative z-20 flex h-full min-h-0 w-[min(100%,18rem)] max-h-full shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-muted/15 px-3 py-3 sm:w-72 sm:px-4"
      data-testid={`admin-entity-relation-filters-side--${slug}`}
      aria-label="Related filters"
    >
      {searchEnabled ? (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor={`admin-entity-list-search-side--${slug}`}
            className="text-sm font-normal text-muted-foreground"
          >
            Search
          </Label>
          {searchTrigger === "submit" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onSearchSubmit?.(localSearchValue.trim())
              }}
              className="flex gap-1.5"
            >
              <Input
                id={`admin-entity-list-search-side--${slug}`}
                type="search"
                value={localSearchValue}
                onChange={(e) => {
                  const v = e.target.value
                  setLocalSearchValue(v)
                  if (v === "") onSearchClear?.()
                }}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-8 min-w-0 flex-1 text-sm"
                data-testid={`admin-entity-list-search--${slug}`}
                aria-label={searchPlaceholder}
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-8 w-8 shrink-0 p-0"
                aria-label="Submit search"
                data-testid={`admin-entity-list-search-submit--${slug}`}
              >
                <Search className="size-3.5" aria-hidden />
              </Button>
            </form>
          ) : (
            <Input
              id={`admin-entity-list-search-side--${slug}`}
              type="search"
              value={localSearchValue}
              onChange={(e) => {
                const v = e.target.value
                setLocalSearchValue(v)
                if (debounceSearchRef.current !== null) clearTimeout(debounceSearchRef.current)
                debounceSearchRef.current = setTimeout(() => { onSearchChange?.(v) }, 400)
              }}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="h-8 text-sm"
              data-testid={`admin-entity-list-search--${slug}`}
              aria-label={searchPlaceholder}
            />
          )}
        </div>
      ) : null}
      {topHintFilters.map((spec) => (
        <HintFilterSidePanelSection
          key={spec.queryParam}
          spec={spec}
          currentValue={hintFilterSegments?.[spec.queryParam] ?? ""}
          onHintFilterChange={onHintFilterChange}
        />
      ))}
      {booleanFilter ? (
        booleanFilterUiStyle === "switch" ? (
          <div
            className="flex items-center justify-between"
            data-testid={`admin-entity-list-boolean-filter--${slug}`}
          >
            <span className="text-sm font-normal text-muted-foreground">
              {booleanFilter.true}
            </span>
            <Switch
              size="sm"
              checked={booleanFilterSegment === "true"}
              onCheckedChange={(checked) =>
                onBooleanFilterChange?.(checked ? "true" : "false")
              }
              data-testid={`admin-entity-list-boolean-filter--${slug}--switch`}
              aria-label={booleanFilter.true}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span
              className="text-sm font-normal text-muted-foreground"
              id={`admin-entity-list-boolean-filter-side-label--${slug}`}
            >
              {booleanFilterGroupLabel}
            </span>
            <ButtonGroup
              segmentStyle="panel"
              role="radiogroup"
              aria-labelledby={`admin-entity-list-boolean-filter-side-label--${slug}`}
              data-testid={`admin-entity-list-boolean-filter--${slug}`}
              className="w-full"
            >
              {(
                [
                  ["all", booleanFilter.all],
                  ["true", booleanFilter.true],
                  ["false", booleanFilter.false],
                ] as const
              ).map(([seg, label]) => (
                <Button
                  key={seg}
                  type="button"
                  role="radio"
                  size="sm"
                  variant={booleanFilterSegment === seg ? "secondary" : "ghost"}
                  aria-checked={booleanFilterSegment === seg}
                  className={cn(
                    "h-9 min-w-0 flex-1 shrink-0 rounded-none border-0 px-2 text-xs shadow-none ring-0 ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    booleanFilterSegment === seg
                      ? "font-semibold text-foreground"
                      : "font-normal text-muted-foreground",
                  )}
                  data-testid={`admin-entity-list-boolean-filter--${slug}--${seg}`}
                  onClick={() => onBooleanFilterChange?.(seg)}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        )
      ) : null}
      {rows.map((row) => (
        <RelationFilterRow
          key={row.columnKey}
          slug={slug}
          row={row}
          q={searchByKey[row.columnKey] ?? ""}
          onQChange={(columnKey, value) =>
            setSearchByKey((prev) => ({ ...prev, [columnKey]: value }))
          }
          collapsedEntry={collapsedByKey[row.columnKey]}
          onSetCollapsedEntry={(columnKey, value) =>
            setCollapsedByKey((prev) => ({ ...prev, [columnKey]: value }))
          }
          onRelationFilterChange={onRelationFilterChange}
          onRelationMultiFilterChange={onRelationMultiFilterChange}
        />
      ))}
      {normalRenderItems.map((item) => {
        if (item.kind === "filter") {
          return (
            <HintFilterSidePanelSection
              key={item.spec.queryParam}
              spec={item.spec}
              currentValue={hintFilterSegments?.[item.spec.queryParam] ?? ""}
              onHintFilterChange={onHintFilterChange}
            />
          )
        }
        // Collapse group
        const hasActiveValue = item.specs.some(
          (s) => (hintFilterSegments?.[s.queryParam] ?? "") !== "",
        )
        const isExpanded = collapseGroupExpanded[item.groupName] ?? hasActiveValue
        const groupId = `admin-entity-hint-filter-collapse-group--${item.groupName.replace(/\s+/g, "-").toLowerCase()}`
        return (
          <div key={`group:${item.groupName}`} className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                setCollapseGroupExpanded((prev) => ({
                  ...prev,
                  [item.groupName]: !isExpanded,
                }))
              }
              className="flex w-full items-center justify-between text-sm font-medium text-foreground"
              aria-expanded={isExpanded}
              aria-controls={groupId}
            >
              <span>{item.groupName}</span>
              <span className="flex items-center gap-1.5">
                {!isExpanded && hasActiveValue && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {item.specs.filter((s) => (hintFilterSegments?.[s.queryParam] ?? "") !== "").length}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </span>
            </button>
            {isExpanded && (
              <div id={groupId} className="flex flex-col gap-4 border-l border-border/50 pl-3">
                {item.specs.map((spec) => (
                  <HintFilterSidePanelSection
                    key={spec.queryParam}
                    spec={spec}
                    currentValue={hintFilterSegments?.[spec.queryParam] ?? ""}
                    onHintFilterChange={onHintFilterChange}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      {onClearAllFilters ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full shrink-0"
          disabled={clearFiltersDisabled}
          aria-label="Clear all filters"
          data-testid={`admin-entity-list-clear-filters--${slug}`}
          onClick={onClearAllFilters}
        >
          Clear all filters
        </Button>
      ) : null}
    </aside>
  )
}


