"use client"

import { AdminEntityListRelationFilterAsyncSearch } from "./admin-entity-list-relation-filter-async-search"
import { AdminEntityListRelationFilterMultiCombobox } from "./admin-entity-list-relation-filter-multi-combobox"
import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import { Label } from "@repo/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"
import { cn } from "@repo/ui/utils"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"

type AdminEntityListRelationFilterSelectsProps = {
  slug: AdminEntitySlug
  rows: readonly AdminEntityListRelationFilterRow[]
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
  /** Wider touch targets and full-width triggers (e.g. mobile filter dialog). */
  fullWidthTriggers?: boolean
  /** When true (desktop), match `listFiltersToolbarDense` control height (h-8) and label size. */
  denseDesktop?: boolean
}

export function AdminEntityListRelationFilterSelects({
  slug,
  rows,
  onRelationFilterChange,
  onRelationMultiFilterChange,
  fullWidthTriggers = false,
  denseDesktop = false,
}: AdminEntityListRelationFilterSelectsProps) {
  const sentinel = "__all__"
  return (
    <>
      {rows.map((row) => {
        if (row.uiVariant === "asyncSearch" && row.relatedSlug != null) {
          return (
            <AdminEntityListRelationFilterAsyncSearch
              key={row.columnKey}
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
              layout="popover"
              showEmptyQueryHint={row.asyncSearchShowEmptyQueryHint === true}
              fullWidth={fullWidthTriggers}
              denseDesktop={denseDesktop}
            />
          )
        }
        if (row.multiSelect) {
          return (
            <AdminEntityListRelationFilterMultiCombobox
              key={row.columnKey}
              slug={slug}
              columnKey={row.columnKey}
              columnLabel={row.columnLabel}
              options={row.options}
              selectedValues={row.selectedValues}
              optionsPending={row.optionsPending}
              onValuesChange={(values) =>
                onRelationMultiFilterChange?.(row.columnKey, values)
              }
              fullWidth={fullWidthTriggers}
              denseDesktop={denseDesktop}
            />
          )
        }
        const selectId = `admin-entity-list-relation-filter--${slug}--${row.columnKey}`
        return (
          <div
            key={row.columnKey}
            className={cn(
              "flex flex-col",
              fullWidthTriggers ? "w-full min-w-0" : "min-w-40",
              denseDesktop && !fullWidthTriggers ? "gap-1" : "gap-1.5",
            )}
          >
            <Label
              htmlFor={selectId}
              className={cn(
                "font-normal text-muted-foreground",
                fullWidthTriggers || denseDesktop ? "text-xs" : "text-sm",
              )}
            >
              {row.columnLabel}
            </Label>
            <Select
              value={row.value === "" ? sentinel : row.value}
              onValueChange={(v) =>
                onRelationFilterChange?.(
                  row.columnKey,
                  v === sentinel ? "" : v,
                )
              }
              disabled={row.optionsPending && row.options.length === 0}
            >
              <SelectTrigger
                id={selectId}
                size={fullWidthTriggers || denseDesktop ? "default" : "lg"}
                className={cn(
                  !denseDesktop && "text-sm",
                  fullWidthTriggers
                    ? "h-9 min-h-9 w-full min-w-0"
                    : denseDesktop
                      ? "h-8 min-h-8 min-w-40 text-xs"
                      : "min-w-40",
                )}
                data-testid={`admin-entity-list-relation-filter--${slug}--${row.columnKey}`}
                aria-label={`Filter by ${row.columnLabel}`}
              >
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectItem value={sentinel}>All</SelectItem>
                  {row.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </>
  )
}
