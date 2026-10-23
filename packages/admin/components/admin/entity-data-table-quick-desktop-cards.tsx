"use client"

import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"

import type { AdminEntityColumn, AdminEntityListRowHighlight } from "../../admin-entity-types"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import { AdminListRowRenderModeProvider } from "../../admin-list-row-render-mode-context"
import { cn } from "@repo/ui/utils"

import { buildPandaPropertyQuickCardBody } from "./entity-data-table-quick-desktop-cards-properties"
import { buildPropertyFormsQuickCardBody } from "./entity-data-table-quick-desktop-cards-property-forms"
import { rowHighlightClassName, rowHighlightLabels } from "./entity-data-table-helpers"

type EntityDataTableQuickDesktopCardsProps<TData> = {
  table: TanStackTable<TData>
  entitySlug: string
  listCols: readonly AdminEntityColumn[]
  listHideRowActions?: boolean
  onRowClick?: (row: TData) => void
  listRowHighlight?: AdminEntityListRowHighlight
}

export function EntityDataTableQuickDesktopCards<TData>({
  table,
  entitySlug,
  listCols,
  listHideRowActions = false,
  onRowClick,
  listRowHighlight,
}: EntityDataTableQuickDesktopCardsProps<TData>) {
  const {
    renderQuickDesktopCardOwnerRows,
    renderQuickDesktopCardSuccessfulBuyerRow,
  } = useAdminClientRegistry()
  const rows = table.getRowModel().rows

  return (
    <AdminListRowRenderModeProvider mode="quick-card">
    <div
      className="flex min-w-0 flex-col gap-1.5 px-3 py-2"
      data-testid={`admin-entity-quick-cards--${entitySlug}`}
    >
      {rows.map((row) => {
        const cells = row.getVisibleCells()
        const actionsCell = cells.find((c) => c.column.id === "actions")
        const bodyCells = cells.filter((c) => c.column.id !== "actions")

        return (
          <article
            key={row.id}
            className={cn(
              "flex min-h-0 min-w-0 flex-col rounded-lg border border-border/80 bg-card/90 shadow-sm",
              onRowClick != null && "cursor-pointer",
              rowHighlightClassName(row.original, listRowHighlight),
            )}
            data-testid={`admin-entity-quick-card--${entitySlug}--${row.id}`}
            data-row-highlight-labels={rowHighlightLabels(row.original, listRowHighlight)}
            onClick={
              onRowClick != null
                ? () => { onRowClick(row.original as TData) }
                : undefined
            }
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2">
              {entitySlug === "property-forms"
                ? buildPropertyFormsQuickCardBody({ rowKey: row.id, entitySlug, bodyCells })
                : buildPandaPropertyQuickCardBody({
                    rowKey: row.id,
                    entitySlug,
                    bodyCells,
                    listCols,
                    onRowClick,
                    ownerRowsResult: renderQuickDesktopCardOwnerRows?.({
                      slug: entitySlug,
                      row: row.original as Record<string, unknown>,
                    }),
                    successfulBuyerRowResult: renderQuickDesktopCardSuccessfulBuyerRow?.({
                      slug: entitySlug,
                      row: row.original as Record<string, unknown>,
                    }),
                  })}
            </div>
            {!listHideRowActions && actionsCell ? (
              <div
                className="flex shrink-0 justify-end gap-1.5 border-t border-border/70 bg-muted/20 px-2 py-1.5"
                data-testid={`admin-entity-quick-card-actions--${entitySlug}--${row.id}`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
    </AdminListRowRenderModeProvider>
  )
}
