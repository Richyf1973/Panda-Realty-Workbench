"use client"

import type { ReactNode } from "react"
import { flexRender, type Cell } from "@tanstack/react-table"
import { Bath, Bed, CarFront, Ruler, Square } from "lucide-react"

import type {
  AdminRenderQuickDesktopCardOwnerRowsResult,
  AdminRenderQuickDesktopCardSuccessfulBuyerRowResult,
} from "../../admin-client-registry-context"
import type { AdminEntityColumn } from "../../admin-entity-types"
import { TooltipProvider } from "@repo/ui/tooltip"

import {
  fieldLabel,
  type IconMetricItem,
  metricTooltipLabel,
  renderIconWithTooltip,
  renderLabelValueRow,
} from "./entity-data-table-quick-desktop-cards-properties-helpers"

export { fieldLabel }

export function buildPandaPropertyQuickCardBody<TData>(args: {
  readonly rowKey: string
  readonly entitySlug: string
  readonly bodyCells: Cell<TData, unknown>[]
  readonly listCols: readonly AdminEntityColumn[]
  readonly onRowClick: ((row: TData) => void) | undefined
  readonly ownerRowsResult?: AdminRenderQuickDesktopCardOwnerRowsResult | null
  readonly successfulBuyerRowResult?: AdminRenderQuickDesktopCardSuccessfulBuyerRowResult | null
}): ReactNode {
  const {
    rowKey,
    entitySlug,
    bodyCells,
    listCols,
    onRowClick,
    ownerRowsResult,
    successfulBuyerRowResult,
  } = args
  const m = new Map(bodyCells.map((c) => [c.column.id, c]))
  const rowLinks = m.get("row-links")
  const status = m.get("propertyStatusId")
  const street = m.get("streetAddress")
  const suburb = m.get("suburb")
  const combinedOwner = m.get("combinedOwner")
  const bed = m.get("bed")
  const bath = m.get("bath")
  const car = m.get("car")
  const building = m.get("buildingArea")
  const landSizeCell = m.get("landSize")
  const price = m.get("salePrice")
  const sold = m.get("saleDate")
  const appraised = m.get("appraisedAmount")
  const contractDate = m.get("contractDate")
  const contractPrice = m.get("contractPrice")
  const completionDate = m.get("completionDate")
  const successfulBuyer = m.get("successfulBuyer")
  const combinedOwnerValue = combinedOwner?.getValue()
  const combinedOwnerText =
    combinedOwnerValue != null ? String(combinedOwnerValue).trim() : ""
  const ownerRowsContent = ownerRowsResult?.content
  const suppressDefaultCombinedOwner = ownerRowsResult?.suppressDefaultCombinedOwner === true
  const successfulBuyerRowContent = successfulBuyerRowResult?.content
  const suppressDefaultSuccessfulBuyer =
    successfulBuyerRowResult?.suppressDefaultSuccessfulBuyer === true

  const landSizeRaw = landSizeCell?.getValue()
  const landSizeValue = landSizeRaw != null && landSizeRaw !== "" ? landSizeRaw : null

  const metricItems: IconMetricItem<TData>[] = []
  if (bed)
    metricItems.push({
      id: "bed",
      cell: bed,
      Icon: Bed,
      label: fieldLabel("bed", listCols),
      tooltipLabel: metricTooltipLabel("bed"),
    })
  if (bath)
    metricItems.push({
      id: "bath",
      cell: bath,
      Icon: Bath,
      label: fieldLabel("bath", listCols),
      tooltipLabel: metricTooltipLabel("bath"),
    })
  if (car)
    metricItems.push({
      id: "car",
      cell: car,
      Icon: CarFront,
      label: fieldLabel("car", listCols),
      tooltipLabel: metricTooltipLabel("car"),
    })
  if (building)
    metricItems.push({
      id: "buildingArea",
      cell: building,
      Icon: Ruler,
      label: fieldLabel("buildingArea", listCols),
      tooltipLabel: metricTooltipLabel("buildingArea"),
    })

  return (
    <TooltipProvider delayDuration={200}>
    <>
      {rowLinks != null || status != null ? (
        <div className="flex min-w-0 items-start justify-between gap-2 border-b border-border/50 pb-1.5">
          <div className="min-w-0">
            {rowLinks != null ? (
              <div
                className="flex items-center gap-1"
                data-testid={`admin-entity-quick-card-field--${entitySlug}--row-links`}
                onClick={onRowClick != null ? (e) => { e.stopPropagation() } : undefined}
              >
                <span className="sr-only">{fieldLabel("row-links", listCols)}</span>
                {flexRender(rowLinks.column.columnDef.cell, rowLinks.getContext())}
              </div>
            ) : (
              <span />
            )}
          </div>
          {status != null ? (
            <div
              className="min-w-0 max-w-[min(100%,22rem)] shrink-0 text-end"
              data-testid={`admin-entity-quick-card-field--${entitySlug}--propertyStatusId`}
            >
              {flexRender(status.column.columnDef.cell, status.getContext())}
            </div>
          ) : null}
        </div>
      ) : null}

      {street != null || suburb != null ? (
        <div
          className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm font-medium leading-snug text-foreground"
          data-testid={`admin-entity-quick-card-field--${entitySlug}--street-suburb`}
        >
          <span className="sr-only">Street and suburb</span>
          {street != null ? (
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {flexRender(street.column.columnDef.cell, street.getContext())}
            </span>
          ) : null}
          {street != null && suburb != null ? (
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              ·
            </span>
          ) : null}
          {suburb != null ? (
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {flexRender(suburb.column.columnDef.cell, suburb.getContext())}
            </span>
          ) : null}
        </div>
      ) : null}

      {ownerRowsContent != null ? ownerRowsContent : null}

      {!suppressDefaultCombinedOwner && combinedOwner != null && combinedOwnerText !== "" && combinedOwnerText !== "—" ? (
        <div
          className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm leading-snug text-foreground"
          data-testid={`admin-entity-quick-card-field--${entitySlug}--combinedOwner`}
        >
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Owners</span>
          <span className="min-w-0 break-words font-medium">
            {flexRender(combinedOwner.column.columnDef.cell, combinedOwner.getContext())}
          </span>
        </div>
      ) : null}

      {metricItems.length > 0 || landSizeValue != null ? (
        <div
          key={`${rowKey}-metrics`}
          className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5"
          data-testid={`admin-entity-quick-card-field--${entitySlug}--metrics`}
        >
          {metricItems.map(({ id, cell, Icon, tooltipLabel }) => (
            <div
              key={id}
              className="flex min-w-0 items-center gap-1 text-sm tabular-nums text-foreground"
              data-testid={`admin-entity-quick-card-field--${entitySlug}--${id}`}
            >
              {renderIconWithTooltip({
                label: tooltipLabel,
                children: <Icon className="size-3.5 text-muted-foreground" aria-hidden />,
              })}
              <span className="min-w-0 font-medium leading-none">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            </div>
          ))}
          {landSizeValue != null ? (
            <div
              className="flex min-w-0 items-center gap-1 text-sm tabular-nums text-foreground"
              data-testid={`admin-entity-quick-card-field--${entitySlug}--landSize`}
            >
              {renderIconWithTooltip({
                label: fieldLabel("landSize", listCols),
                children: <Square className="size-3.5 text-muted-foreground" aria-hidden />,
              })}
              <span className="min-w-0 font-medium leading-none">{String(landSizeValue)}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {price != null
        ? renderLabelValueRow({ entitySlug, columnId: "salePrice", cell: price, listCols, valueRight: true })
        : null}
      {sold != null
        ? renderLabelValueRow({ entitySlug, columnId: "saleDate", cell: sold, listCols, valueRight: true })
        : null}
      {appraised != null && appraised.getValue() != null
        ? renderLabelValueRow({ entitySlug, columnId: "appraisedAmount", cell: appraised, listCols, valueRight: true })
        : null}
      {contractDate != null ? (
        <div
          className="flex w-full min-w-0 items-baseline justify-between gap-3 text-sm"
          data-testid={`admin-entity-quick-card-field--${entitySlug}--contractDate`}
        >
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {fieldLabel("contractDate", listCols)}
          </span>
          <div className="shrink-0 text-end font-medium text-foreground tabular-nums">
            {contractDate.getValue() != null
              ? flexRender(contractDate.column.columnDef.cell, contractDate.getContext())
              : "-"}
          </div>
        </div>
      ) : null}
      {contractPrice != null && contractPrice.getValue() != null
        ? renderLabelValueRow({ entitySlug, columnId: "contractPrice", cell: contractPrice, listCols, valueRight: true })
        : null}
      {completionDate != null
        ? renderLabelValueRow({
            entitySlug,
            columnId: "completionDate",
            cell: completionDate,
            listCols,
            valueRight: true,
            emptyPlaceholder: "-",
          })
        : null}
      {successfulBuyerRowContent != null ? successfulBuyerRowContent : null}
      {!suppressDefaultSuccessfulBuyer &&
      successfulBuyer != null &&
      successfulBuyer.getValue() != null &&
      successfulBuyer.getValue() !== ""
        ? renderLabelValueRow({ entitySlug, columnId: "successfulBuyer", cell: successfulBuyer, listCols })
        : null}
    </>
    </TooltipProvider>
  )
}
