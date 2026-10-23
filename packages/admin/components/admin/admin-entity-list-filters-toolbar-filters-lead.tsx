"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { adminEntityListFilterSegmentButtonClassName } from "./admin-entity-list-filter-segment-button-classname"
import { AdminEntityHintFilterSegmentButton } from "./admin-entity-hint-filter-segment-button"
import { HintFilterSidePanelSection } from "./admin-entity-hint-filter-section"
import type { AdminEntityListFiltersToolbarItemsProps } from "./admin-entity-list-filters-toolbar-props"
import type { AdminEntityListAppendWhereHintFilter } from "../../admin-entity-types"
import { Button } from "@repo/ui/button"
import { ButtonGroup } from "@repo/ui/button-group"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"

export function AdminEntityListFiltersToolbarFiltersLead(
  props: AdminEntityListFiltersToolbarItemsProps,
) {
  const {
    denseDesktop,
    labelClass,
    fieldWrap,
    slug,
    compactVertical = false,
    listSearchEnabled = false,
    listSearchValue = "",
    onListSearchChange,
    listSearchPlaceholder = "Search",
    listBooleanFilterEnabled = false,
    listBooleanFilterSegment = "all",
    onListBooleanFilterChange,
    listBooleanFilterLabels,
    listBooleanFilterGroupLabel = "Filter",
    listAppendWhereHintFilterEnabled = false,
    listAppendWhereHintSpecs = [],
    listAppendWhereHintSegments = {},
    onListAppendWhereHintSegmentChange,
  } = props

  const [localSearchValue, setLocalSearchValue] = useState(listSearchValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalSearchValue(listSearchValue)
  }, [listSearchValue])

  function handleSearchChange(value: string) {
    setLocalSearchValue(value)
    if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onListSearchChange?.(value)
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    }
  }, [])

  type RenderItem =
    | { kind: "filter"; spec: AdminEntityListAppendWhereHintFilter }
    | { kind: "group"; groupName: string; specs: AdminEntityListAppendWhereHintFilter[] }

  // Split hint specs: top specs (uiPosition === "top") rendered before the boolean
  // filter, normal specs rendered after. Memoized — entity config arrays are stable.
  const { topHintSpecs, normalRenderItems } = useMemo(() => {
    const top = listAppendWhereHintSpecs.filter(
      (s) => s.uiPosition === "top" && s.hidden !== true,
    )
    const normal = listAppendWhereHintSpecs.filter(
      (s) => s.uiPosition !== "top" && s.hidden !== true,
    )
    const groupMap: Record<string, AdminEntityListAppendWhereHintFilter[]> = {}
    for (const spec of normal) {
      if (spec.collapseGroup) {
        if (!groupMap[spec.collapseGroup]) groupMap[spec.collapseGroup] = []
        groupMap[spec.collapseGroup]!.push(spec)
      }
    }
    const seen = new Set<string>()
    const items: RenderItem[] = normal.flatMap<RenderItem>((spec) => {
      if (!spec.collapseGroup) return [{ kind: "filter" as const, spec }]
      if (seen.has(spec.collapseGroup)) return []
      seen.add(spec.collapseGroup)
      return [{ kind: "group" as const, groupName: spec.collapseGroup, specs: groupMap[spec.collapseGroup]! }]
    })
    return { topHintSpecs: top, normalRenderItems: items }
  }, [listAppendWhereHintSpecs])

  const [collapseGroupExpanded, setCollapseGroupExpanded] = useState<Record<string, boolean>>({})

  const showHintFilters =
    listAppendWhereHintFilterEnabled && onListAppendWhereHintSegmentChange

  return (
    <>
      {listSearchEnabled ? (
        <div className={fieldWrap}>
          <Label
            htmlFor={`admin-entity-list-search--${slug}`}
            className={labelClass}
          >
            Search
          </Label>
          <Input
            id={`admin-entity-list-search--${slug}`}
            type="search"
            value={localSearchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={listSearchPlaceholder}
            autoComplete="off"
            className={cn(
              compactVertical
                ? "h-9 min-h-9 text-sm"
                : denseDesktop
                  ? "h-8 min-h-8 text-xs"
                  : "h-9",
            )}
            data-testid={`admin-entity-list-search--${slug}`}
            aria-label={listSearchPlaceholder}
          />
        </div>
      ) : null}

      {/* Top-position hint filters (e.g. Suburb) — rendered above boolean filter */}
      {showHintFilters && topHintSpecs.length > 0
        ? topHintSpecs.map((spec) => (
            <div
              key={spec.queryParam}
              data-testid={`admin-entity-list-append-where-hint--${slug}--${spec.queryParam}`}
            >
              <HintFilterSidePanelSection
                spec={spec}
                currentValue={listAppendWhereHintSegments[spec.queryParam] ?? ""}
                onHintFilterChange={onListAppendWhereHintSegmentChange}
              />
            </div>
          ))
        : null}

      {listBooleanFilterEnabled && listBooleanFilterLabels ? (
        <div
          className={cn(
            "flex min-w-0 flex-col items-start",
            denseDesktop ? "gap-1" : "gap-1.5",
            compactVertical ? "w-full" : "w-auto max-w-full",
          )}
        >
          <span
            className={labelClass}
            id={`admin-entity-list-boolean-filter-label--${slug}`}
          >
            {listBooleanFilterGroupLabel}
          </span>
          <ButtonGroup
            segmentStyle="panel"
            role="radiogroup"
            aria-labelledby={`admin-entity-list-boolean-filter-label--${slug}`}
            data-testid={`admin-entity-list-boolean-filter--${slug}`}
            className="w-full sm:w-auto"
          >
            {(
              [
                ["all", listBooleanFilterLabels.all],
                ["true", listBooleanFilterLabels.true],
                ["false", listBooleanFilterLabels.false],
              ] as const
            ).map(([seg, label]) => (
              <Button
                key={seg}
                type="button"
                role="radio"
                size="sm"
                variant={
                  listBooleanFilterSegment === seg ? "secondary" : "ghost"
                }
                aria-checked={listBooleanFilterSegment === seg}
                className={adminEntityListFilterSegmentButtonClassName(
                  compactVertical,
                  listBooleanFilterSegment === seg,
                  { compactGrow: compactVertical, denseDesktop },
                )}
                data-testid={`admin-entity-list-boolean-filter--${slug}--${seg}`}
                onClick={() => onListBooleanFilterChange?.(seg)}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      ) : null}

      {/* Normal hint filters (with collapse-group support) — rendered after boolean filter */}
      {showHintFilters && normalRenderItems.length > 0
        ? normalRenderItems.map((item) => {
            if (item.kind === "filter") {
              if (item.spec.uiStyle === "segment-button") {
                return (
                  <div
                    key={item.spec.queryParam}
                    data-testid={`admin-entity-list-append-where-hint--${slug}--${item.spec.queryParam}`}
                  >
                    <AdminEntityHintFilterSegmentButton
                      spec={item.spec}
                      slug={slug}
                      currentValue={listAppendWhereHintSegments[item.spec.queryParam] ?? ""}
                      denseDesktop={denseDesktop}
                      labelClass={labelClass}
                      compactVertical={compactVertical}
                      onSegmentChange={onListAppendWhereHintSegmentChange}
                    />
                  </div>
                )
              }
              return (
                <div
                  key={item.spec.queryParam}
                  data-testid={`admin-entity-list-append-where-hint--${slug}--${item.spec.queryParam}`}
                >
                  <HintFilterSidePanelSection
                    spec={item.spec}
                    currentValue={listAppendWhereHintSegments[item.spec.queryParam] ?? ""}
                    onHintFilterChange={onListAppendWhereHintSegmentChange}
                  />
                </div>
              )
            }
            // Collapse group
            const hasActiveValue = item.specs.some(
              (s) => (listAppendWhereHintSegments[s.queryParam] ?? "") !== "",
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
                        {item.specs.filter((s) => (listAppendWhereHintSegments[s.queryParam] ?? "") !== "").length}
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
                        currentValue={listAppendWhereHintSegments[spec.queryParam] ?? ""}
                        onHintFilterChange={onListAppendWhereHintSegmentChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        : null}
    </>
  )
}
