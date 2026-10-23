"use client"

import { LayoutGrid, Maximize2, Minimize2, Plus, RefreshCw, Table2 } from "lucide-react"

import type { AdminListViewportChromeValue } from "../../admin-list-viewport-chrome-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityListGridSpec } from "../../admin-entity-types"
import { Button } from "@repo/ui/button"
import { CardTitle } from "@repo/ui/card"
import { ClientOnly } from "@repo/ui/client-only"
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

export type AdminEntityAdminListCardToolbarRowProps = {
  slug: AdminEntitySlug
  listTitle: string
  showListCardTitle: boolean
  isCompactList: boolean
  /** When true on desktop, tighter gap between title row and actions. */
  listToolbarDenseDesktop: boolean
  listCreateEnabled: boolean
  onOpenCreateDialog?: () => void
  addNewLabel: string
  addNewDisabled: boolean
  isLoading: boolean
  isRefetching: boolean
  listViewportChrome: AdminListViewportChromeValue | null
  listGrid: AdminEntityListGridSpec | null | undefined
  listLayoutMode: "table" | "grid"
  onListLayoutModeChange?: (mode: "table" | "grid") => void
  onListRefresh: () => void
  pageSizeOptions: readonly number[]
  listLimit: number
  onPageSizeChange: (raw: string) => void
}

export function AdminEntityAdminListCardToolbarRow({
  slug,
  listTitle,
  showListCardTitle,
  isCompactList,
  listToolbarDenseDesktop,
  listCreateEnabled,
  onOpenCreateDialog,
  addNewLabel,
  addNewDisabled,
  isLoading,
  isRefetching,
  listViewportChrome,
  listGrid,
  listLayoutMode,
  onListLayoutModeChange,
  onListRefresh,
  pageSizeOptions,
  listLimit,
  onPageSizeChange,
}: AdminEntityAdminListCardToolbarRowProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        isCompactList
          ? "gap-2"
          : listToolbarDenseDesktop
            ? "flex-wrap items-end justify-between gap-2"
            : "flex-wrap items-end justify-between gap-3",
        !isCompactList && "justify-between",
        isCompactList && !showListCardTitle && "justify-end",
        isCompactList && showListCardTitle && "justify-between",
      )}
    >
      {showListCardTitle ? (
        <CardTitle
          className={cn(
            "min-w-0 shrink pr-1",
            isCompactList ? "flex-1 truncate text-sm" : "text-base",
          )}
          data-testid={`admin-entity-list-card-title--${slug}`}
        >
          {listTitle}
        </CardTitle>
      ) : null}
      <div
        className={cn(
          "flex shrink-0 items-center",
          isCompactList ? "gap-1" : "flex-wrap justify-end gap-2",
        )}
      >
        {listCreateEnabled && onOpenCreateDialog ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "shrink-0 gap-1.5",
              isCompactList ? "h-8 px-2.5 text-xs" : "h-9 px-3",
            )}
            disabled={addNewDisabled || isLoading || isRefetching}
            aria-label={addNewLabel}
            data-testid={`admin-entity-list-add-new--${slug}`}
            onClick={onOpenCreateDialog}
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            {addNewLabel}
          </Button>
        ) : null}
        {listViewportChrome != null && isCompactList ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-pressed={listViewportChrome.fullViewportList}
            aria-label={
              listViewportChrome.fullViewportList
                ? "Show site chrome"
                : "Full screen list"
            }
            data-testid={`admin-entity-list-full-viewport-toggle--${slug}`}
            onClick={() =>
              listViewportChrome.setFullViewportList(
                !listViewportChrome.fullViewportList,
              )
            }
          >
            {listViewportChrome.fullViewportList ? (
              <Minimize2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Maximize2 className="size-3.5 shrink-0" aria-hidden />
            )}
          </Button>
        ) : listViewportChrome != null ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-3"
            aria-pressed={listViewportChrome.fullViewportList}
            aria-label={
              listViewportChrome.fullViewportList
                ? "Show site chrome"
                : "Full screen list"
            }
            data-testid={`admin-entity-list-full-viewport-toggle--${slug}`}
            onClick={() =>
              listViewportChrome.setFullViewportList(
                !listViewportChrome.fullViewportList,
              )
            }
          >
            {listViewportChrome.fullViewportList ? (
              <Minimize2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Maximize2 className="size-3.5 shrink-0" aria-hidden />
            )}
            {listViewportChrome.fullViewportList ? "Exit" : "Full screen"}
          </Button>
        ) : null}
        {listGrid != null && !isCompactList && onListLayoutModeChange ? (
          <div
            className="flex shrink-0 overflow-hidden rounded-md border border-border"
            role="group"
            aria-label="List layout"
          >
            <Button
              type="button"
              variant={listLayoutMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-none border-0 shadow-none px-3"
              disabled={isLoading || isRefetching}
              aria-pressed={listLayoutMode === "table"}
              data-testid={`admin-entity-list-layout-table--${slug}`}
              onClick={() => onListLayoutModeChange("table")}
            >
              <Table2 className="size-4 shrink-0" aria-hidden />
              Table
            </Button>
            <Button
              type="button"
              variant={listLayoutMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-none border-0 shadow-none px-3"
              disabled={isLoading || isRefetching}
              aria-pressed={listLayoutMode === "grid"}
              data-testid={`admin-entity-list-layout-grid--${slug}`}
              onClick={() => onListLayoutModeChange("grid")}
            >
              <LayoutGrid className="size-4 shrink-0" aria-hidden />
              Grid
            </Button>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size={isCompactList ? "icon" : "sm"}
          className={cn(isCompactList ? "h-8 w-8" : "h-9 gap-1.5 px-3")}
          disabled={isLoading || isRefetching}
          aria-label="Refresh list"
          data-testid={`admin-entity-list-refresh--${slug}`}
          onClick={onListRefresh}
        >
          <RefreshCw
            className={cn(
              "shrink-0",
              isCompactList ? "size-3.5" : "size-4",
              isRefetching && "animate-spin",
            )}
            aria-hidden
          />
          {isCompactList ? null : <span>Refresh</span>}
        </Button>
        <span
          className={cn(
            "whitespace-nowrap font-normal text-muted-foreground",
            isCompactList ? "sr-only" : "text-sm",
          )}
        >
          Rows per page
        </span>
        <ClientOnly
          fallback={
            <Skeleton
              className={cn(
                "min-w-16 rounded-md",
                isCompactList ? "h-8" : "h-9 min-w-20",
              )}
              aria-hidden
              data-testid={`admin-entity-page-size--${slug}--ssr-fallback`}
            />
          }
        >
          <Select value={String(listLimit)} onValueChange={onPageSizeChange}>
            <SelectTrigger
              id={`admin-entity-page-size--${slug}`}
              size={isCompactList ? "default" : "lg"}
              className={cn(
                isCompactList ? "h-8 min-w-17 text-xs" : "min-w-20",
              )}
              data-testid={`admin-entity-page-size--${slug}`}
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>
    </div>
  )
}
