"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import type { AdminEntityListAppendWhereHintFilter } from "../../admin-entity-types"
import { HintFilterChips } from "./admin-entity-hint-filter-chips"
import { HintFilterCombobox } from "./admin-entity-hint-filter-combobox"
import { HintFilterRange } from "./admin-entity-hint-filter-range"
import { Button } from "@repo/ui/button"
import { Label } from "@repo/ui/label"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

type HintFilterSidePanelSectionProps = {
  spec: AdminEntityListAppendWhereHintFilter
  currentValue: string
  onHintFilterChange?: (queryParam: string, value: string) => void
}

export function HintFilterSidePanelSection({
  spec,
  currentValue,
  onHintFilterChange,
}: HintFilterSidePanelSectionProps) {
  const queryClient = useQueryClient()
  const [syncPending, setSyncPending] = React.useState(false)
  const [syncError, setSyncError] = React.useState<string | null>(null)

  const fetchQuery = useQuery({
    queryKey: ["hint-filter-options", spec.fetchOptionsPath],
    enabled: spec.fetchOptionsPath != null,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ options: { value: string; label: string }[] }> => {
      const res = await fetch(spec.fetchOptionsPath!, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load options")
      return res.json() as Promise<{ options: { value: string; label: string }[] }>
    },
  })

  const options =
    spec.fetchOptionsPath != null ? (fetchQuery.data?.options ?? []) : spec.options
  const isPending = fetchQuery.isPending && spec.fetchOptionsPath != null
  const groupLabelId = `admin-entity-hint-filter-side-label--${spec.queryParam}`
  const selectedValue = currentValue === "" ? "__all__" : currentValue

  async function handleSync() {
    if (!spec.syncPath) return
    setSyncPending(true)
    setSyncError(null)
    try {
      const res = await fetch(spec.syncPath, { method: "POST" })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Sync failed")
      }
      await queryClient.invalidateQueries({
        queryKey: ["hint-filter-options", spec.fetchOptionsPath],
      })
      for (const qk of spec.syncInvalidatesQueryKeys ?? []) {
        await queryClient.invalidateQueries({ queryKey: qk as string[] })
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncPending(false)
    }
  }

  if (spec.hidden) return null

  return (
    <div
      className="flex shrink-0 flex-col gap-2"
      data-testid={`admin-entity-list-hint-filter-side--${spec.queryParam}`}
    >
      <div className="flex items-center justify-between gap-1">
        <Label id={groupLabelId} className="text-sm font-medium text-foreground">
          {spec.groupLabel}
        </Label>
        {spec.syncPath ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            disabled={syncPending}
            title="Sync options"
            aria-label={`Sync ${spec.groupLabel} options`}
            onClick={() => void handleSync()}
          >
            <RefreshCw
              className={cn("size-3.5", syncPending && "animate-spin")}
              aria-hidden
            />
          </Button>
        ) : null}
      </div>
      {syncError ? (
        <p className="text-xs text-destructive" role="alert">
          {syncError}
        </p>
      ) : null}
      {spec.uiStyle === "combobox" ? (
        <HintFilterCombobox
          options={options}
          currentValue={currentValue}
          allLabel={spec.allLabel}
          groupLabel={spec.groupLabel}
          queryParam={spec.queryParam}
          currentValueDisplay={spec.currentValueDisplay}
          groupLabelId={groupLabelId}
          onHintFilterChange={onHintFilterChange}
        />
      ) : spec.uiStyle === "horizontal-chips" ? (
        <HintFilterChips
          options={options}
          currentValue={currentValue}
          allLabel={spec.allLabel}
          queryParam={spec.queryParam}
          multiSelect={spec.multiSelect ?? false}
          isPending={isPending}
          groupLabelId={groupLabelId}
          onHintFilterChange={onHintFilterChange}
        />
      ) : spec.uiStyle === "numeric-range" || spec.uiStyle === "date-range" ? (
        <HintFilterRange
          currentValue={currentValue}
          groupLabel={spec.groupLabel}
          queryParam={spec.queryParam}
          isDateRange={spec.uiStyle === "date-range"}
          groupLabelId={groupLabelId}
          onHintFilterChange={onHintFilterChange}
        />
      ) : (
        <div
          className="scrollbar-galaxy flex max-h-52 min-h-18 flex-col gap-1 overflow-y-auto rounded-md border border-border/80 bg-background/80 p-1.5"
          role="radiogroup"
          aria-labelledby={groupLabelId}
        >
          {isPending ? (
            <div className="flex flex-col gap-2 p-1" aria-busy>
              <Skeleton className="h-8 w-full" />
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
                className={cn(
                  "h-auto min-h-8 w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm font-normal",
                )}
                onClick={() => onHintFilterChange?.(spec.queryParam, "")}
              >
                {spec.allLabel}
              </Button>
              {options.length === 0 && !isPending ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  No options available.
                </p>
              ) : (
                options.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    role="radio"
                    variant={selectedValue === opt.value ? "default" : "ghost"}
                    size="sm"
                    aria-checked={selectedValue === opt.value}
                    className={cn(
                      "h-auto min-h-8 w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm font-normal",
                    )}
                    onClick={() => onHintFilterChange?.(spec.queryParam, opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
