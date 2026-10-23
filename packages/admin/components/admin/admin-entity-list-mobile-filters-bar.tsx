"use client"

import { useState } from "react"

import { AdminEntityListFiltersToolbar } from "./admin-entity-list-filters-toolbar"
import type { AdminEntityListFiltersToolbarProps } from "./admin-entity-list-filters-toolbar"
import type { AdminEntityListFilterSummaryLine } from "../../admin-entity-list-filter-summary"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { cn } from "@repo/ui/utils"

type AdminEntityListMobileFiltersBarProps = {
  slug: AdminEntitySlug
  summaryLines: readonly AdminEntityListFilterSummaryLine[]
  toolbarProps: AdminEntityListFiltersToolbarProps
  /** Tighter padding and controls for very small viewports. */
  compactChrome?: boolean
}

export function AdminEntityListMobileFiltersBar({
  slug,
  summaryLines,
  toolbarProps,
  compactChrome = false,
}: AdminEntityListMobileFiltersBarProps) {
  const [open, setOpen] = useState(false)
  const activeCount = summaryLines.filter((l) => l.isActive).length
  const clearInFooter = Boolean(toolbarProps.onClearAllListFilters)

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-md border border-border/70 bg-muted/20 cursor-pointer",
        compactChrome ? "px-2 py-1.5" : "px-3 py-2",
      )}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label="Edit list filters"
      data-testid={`admin-entity-list-mobile-filters-bar--${slug}`}
      onPointerDown={(e) => { if (e.button === 0) setOpen(true) }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setOpen(true)
        }
      }}
    >
      <div
        className={cn(
          "flex min-h-8 min-w-0 items-center gap-2",
          compactChrome ? "gap-1.5" : "gap-2",
        )}
      >
        <p
          className={cn(
            "inline-flex shrink-0 items-center font-medium uppercase tracking-wide text-muted-foreground",
            compactChrome ? "text-[0.65rem] leading-tight" : "text-xs",
          )}
        >
          Filters
          {activeCount > 0 ? (
            <span
              className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/15 px-1 py-0.5 text-[0.6rem] font-semibold leading-none text-primary tabular-nums"
              data-testid={`admin-entity-list-mobile-filter-active-count--${slug}`}
            >
              {activeCount}
            </span>
          ) : null}
        </p>
        <div className="min-h-0 min-w-0 flex-1">
          <div
            className="scrollbar-galaxy min-h-0 min-w-0 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain"
            data-testid={`admin-entity-list-mobile-filter-summary--${slug}`}
            aria-label="Current list filters"
          >
            <div
              className="flex w-max items-center gap-1.5 pb-0 pt-0.5 pr-1"
              role="list"
            >
              {summaryLines.map((line, i) => (
                <div
                  key={`${line.groupLabel}--${i}`}
                  role="listitem"
                  data-testid={`admin-entity-list-mobile-filter-chip--${slug}--${line.groupLabel}`}
                  className={cn(
                    "flex max-w-[min(18rem,78vw)] shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/90 px-2 py-0.5 shadow-sm",
                    compactChrome ? "text-[0.7rem] leading-tight" : "text-xs",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">
                    {line.groupLabel}
                  </span>
                  <span className="shrink-0 text-muted-foreground/80" aria-hidden>
                    ·
                  </span>
                  <span
                    className={cn(
                      "min-w-0 truncate font-medium",
                      line.isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                    title={`${line.groupLabel}: ${line.valueLabel}`}
                    data-testid={`admin-entity-list-mobile-filter-chip-value--${slug}--${line.groupLabel}`}
                  >
                    {line.valueLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 max-w-[calc(100%-1rem)] sm:max-w-lg"
          data-testid={`admin-entity-list-mobile-filters-dialog--${slug}`}
        >
          <DialogHeader className="shrink-0 border-b border-border px-3 py-2.5 pr-10 text-left">
            <DialogTitle className="text-sm font-semibold">Filters</DialogTitle>
          </DialogHeader>
          <div className="scrollbar-galaxy min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
            <AdminEntityListFiltersToolbar
              {...toolbarProps}
              compactVertical
              suppressClearButton={clearInFooter}
            />
          </div>
          <DialogFooter
            className={cn(
              "mx-0 mb-0 shrink-0 flex-row flex-wrap gap-2 border-t border-border bg-muted/30 px-3 py-2.5",
              "items-stretch justify-stretch sm:justify-end",
            )}
          >
            {clearInFooter ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 flex-1 basis-0 sm:flex-initial"
                disabled={
                  toolbarProps.isLoading || toolbarProps.listFiltersClearDisabled
                }
                aria-label="Clear all filters"
                data-testid={`admin-entity-list-clear-filters--${slug}`}
                onClick={toolbarProps.onClearAllListFilters}
              >
                Clear filters
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className={cn(
                "min-h-9 flex-1 basis-0 sm:max-w-xs sm:flex-initial",
                clearInFooter && "sm:min-w-28",
              )}
              data-testid={`admin-entity-list-mobile-filters-done--${slug}`}
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
