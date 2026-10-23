"use client"

import { AdminEntityListDateRangePicker } from "./admin-entity-list-date-range-picker"
import { AdminEntityListRelationFilterSelects } from "./admin-entity-list-relation-filter-selects"
import type { AdminEntityListFiltersToolbarItemsProps } from "./admin-entity-list-filters-toolbar-props"
import { Button } from "@repo/ui/button"
import { ClientOnly } from "@repo/ui/client-only"
import { Label } from "@repo/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

export function AdminEntityListFiltersToolbarFiltersTail(
  props: AdminEntityListFiltersToolbarItemsProps,
) {
  const {
    denseDesktop,
    labelClass,
    slug,
    compactVertical = false,
    listYearMonthFilterEnabled = false,
    listYearMonthFilterLabel = "Reporting period",
    listYearMonthFilterValue = "__all__",
    listYearMonthFilterAllowAll = true,
    listYearMonthFilterOptions = [],
    listYearMonthFilterPending = false,
    onListYearMonthFilterChange,
    listDateRangeFilterEnabled = false,
    listDateRangeFilterRows = [],
    onListDateRangeChange,
    listRelationFilterEnabled = false,
    relationFilterRows = [],
    onRelationFilterChange,
    onRelationMultiFilterChange,
    onClearAllListFilters,
    listFiltersClearDisabled = true,
    isLoading = false,
    suppressClearButton = false,
  } = props

  return (
    <>
      {listYearMonthFilterEnabled ? (
        <ClientOnly
          fallback={
            <Skeleton
              className={cn(
                compactVertical
                  ? "h-9 min-h-9 w-full rounded-md"
                  : "h-9 min-w-44 rounded-md",
              )}
              aria-hidden
              data-testid={`admin-entity-list-year-month-filter--${slug}--ssr-fallback`}
            />
          }
        >
          <div
            className={cn(
              "flex min-w-0 flex-col",
              denseDesktop ? "gap-1" : "gap-1.5",
              compactVertical && "w-full",
            )}
          >
            <Label
              htmlFor={`admin-entity-list-year-month-filter--${slug}`}
              className={labelClass}
            >
              {listYearMonthFilterLabel}
            </Label>
            <Select
              value={listYearMonthFilterValue}
              onValueChange={onListYearMonthFilterChange}
              disabled={listYearMonthFilterPending}
            >
              <SelectTrigger
                id={`admin-entity-list-year-month-filter--${slug}`}
                size={compactVertical || denseDesktop ? "default" : "lg"}
                className={cn(
                  compactVertical
                    ? "h-9 min-h-9 w-full min-w-0 text-sm"
                    : denseDesktop
                      ? "h-8 min-h-8 min-w-44 text-xs"
                      : "h-9 min-w-44",
                )}
                data-testid={`admin-entity-list-year-month-filter--${slug}`}
                aria-label={listYearMonthFilterLabel}
              >
                <SelectValue
                  placeholder={
                    listYearMonthFilterAllowAll
                      ? "All periods"
                      : listYearMonthFilterLabel
                  }
                />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {listYearMonthFilterAllowAll ? (
                    <SelectItem value="__all__">All periods</SelectItem>
                  ) : null}
                  {listYearMonthFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </ClientOnly>
      ) : null}
      {listDateRangeFilterEnabled && onListDateRangeChange
        ? listDateRangeFilterRows.map((row) => (
            <AdminEntityListDateRangePicker
              key={row.columnKey}
              slug={slug}
              scopeColumnKey={
                listDateRangeFilterRows.length > 1 ? row.columnKey : undefined
              }
              filterLabel={row.label}
              valueFrom={row.from}
              valueTo={row.to}
              onChange={(from, to) =>
                onListDateRangeChange(row.columnKey, from, to)
              }
              compact={compactVertical || denseDesktop}
            />
          ))
        : null}
      {listRelationFilterEnabled && relationFilterRows.length > 0 ? (
        <ClientOnly
          fallback={
            <div
              className="flex w-full flex-col gap-4"
              aria-hidden
              data-testid={`admin-entity-relation-filters--${slug}--ssr-fallback`}
            >
              {relationFilterRows.map((row) => (
                <Skeleton
                  key={row.columnKey}
                  className="h-9 min-h-9 w-full rounded-md"
                />
              ))}
            </div>
          }
        >
          <AdminEntityListRelationFilterSelects
            slug={slug}
            rows={relationFilterRows}
            onRelationFilterChange={onRelationFilterChange}
            onRelationMultiFilterChange={onRelationMultiFilterChange}
            fullWidthTriggers={compactVertical}
            denseDesktop={denseDesktop}
          />
        </ClientOnly>
      ) : null}
      {onClearAllListFilters && !suppressClearButton ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            compactVertical
              ? "h-9 min-h-9 w-full shrink-0 px-3 sm:w-auto"
              : denseDesktop
                ? "h-8 min-h-8 shrink-0 px-2.5 text-xs"
                : "h-9 shrink-0 px-3",
          )}
          disabled={isLoading || listFiltersClearDisabled}
          aria-label="Clear all filters"
          data-testid={`admin-entity-list-clear-filters--${slug}`}
          onClick={onClearAllListFilters}
        >
          Clear filters
        </Button>
      ) : null}
    </>
  )
}
