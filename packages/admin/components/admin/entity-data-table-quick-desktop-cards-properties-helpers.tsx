"use client"

import type { ReactNode } from "react"
import { flexRender, type Cell } from "@tanstack/react-table"
import type { LucideIcon } from "lucide-react"

import type { AdminEntityColumn } from "../../admin-entity-types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"
import { cn } from "@repo/ui/utils"

export type IconMetricItem<TData> = {
  readonly id: string
  readonly cell: Cell<TData, unknown>
  readonly Icon: LucideIcon
  readonly label: string
  readonly tooltipLabel: string
}

export function fieldLabel(columnId: string, listCols: readonly AdminEntityColumn[]): string {
  if (columnId === "row-links") return "Links"
  return listCols.find((c) => c.key === columnId)?.label ?? columnId
}

export function metricTooltipLabel(columnId: string): string {
  switch (columnId) {
    case "bed":
      return "Bed"
    case "bath":
      return "Bath"
    case "car":
      return "Car"
    case "buildingArea":
      return "Building area"
    default:
      return columnId
  }
}

export function renderIconWithTooltip(args: {
  readonly label: string
  readonly children: ReactNode
}): ReactNode {
  const { label, children } = args
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          tabIndex={0}
          aria-label={label}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export function renderLabelValueRow<TData>(args: {
  readonly entitySlug: string
  readonly columnId: string
  readonly cell: Cell<TData, unknown>
  readonly listCols: readonly AdminEntityColumn[]
  readonly valueRight?: boolean
  readonly emptyPlaceholder?: ReactNode
}): ReactNode {
  const { entitySlug, columnId, cell, listCols, valueRight, emptyPlaceholder } = args
  const label = fieldLabel(columnId, listCols)
  const rawValue = cell.getValue()
  const isEmptyValue = rawValue == null || rawValue === ""
  return (
    <div
      key={cell.id}
      className={cn(
        "flex w-full min-w-0 items-baseline gap-3 text-sm",
        valueRight ? "justify-between" : "flex-wrap gap-x-2 gap-y-0",
      )}
      data-testid={`admin-entity-quick-card-field--${entitySlug}--${columnId}`}
    >
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div
        className={cn(
          "min-w-0 font-medium text-foreground [overflow-wrap:anywhere]",
          valueRight ? "shrink-0 text-end tabular-nums" : "flex-1 break-words",
        )}
      >
        {isEmptyValue && emptyPlaceholder !== undefined
          ? emptyPlaceholder
          : flexRender(cell.column.columnDef.cell, cell.getContext())}
      </div>
    </div>
  )
}
