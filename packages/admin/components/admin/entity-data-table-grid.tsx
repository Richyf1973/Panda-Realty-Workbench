"use client"

import {
  flexRender,
  type Cell,
  type Row,
  type Table as TanStackTable,
} from "@tanstack/react-table"

import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import { resolveAdminEntityCellAlign } from "../../admin-entity-list-cell"
import type { AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminRenderAdminEntityListGridItem } from "../../admin-client-registry-context"
import { AdminListRowRenderModeProvider } from "../../admin-list-row-render-mode-context"
import { cn } from "@repo/ui/utils"

/** Label + value stack alignment matches list/table {@link resolveAdminEntityCellAlign} rules. */
function gridPreviewStackAlignClass(field: AdminEntityColumn | undefined): string {
  if (!field) return "text-start"
  const a = resolveAdminEntityCellAlign(field)
  if (a === "right") return "text-end"
  if (a === "center") return "text-center"
  return "text-start"
}

function gridPreviewValueExtraClass(
  field: AdminEntityColumn | undefined,
): string | undefined {
  const a = field ? resolveAdminEntityCellAlign(field) : "left"
  return a === "right" ? "tabular-nums" : undefined
}

export function adminEntityListGridPreviewColumnKeys<TData>(
  table: TanStackTable<TData>,
  previewColumnCount: number,
): string[] {
  const n = Math.max(0, Math.floor(previewColumnCount))
  if (n === 0) return []
  const visible = table
    .getVisibleFlatColumns()
    .map((c) => c.id)
    .filter((id) => id !== "actions")
  return visible.slice(0, n)
}

function cellForColumn<TData>(
  row: Row<TData>,
  columnId: string,
): Cell<TData, unknown> | undefined {
  return row.getVisibleCells().find((c) => c.column.id === columnId)
}

type EntityDataTableGridProps = {
  table: TanStackTable<AdminEntityTableRow>
  entitySlug: AdminEntitySlug
  listCols: readonly AdminEntityColumn[]
  previewColumnCount: number
  renderCustomItem?: AdminRenderAdminEntityListGridItem
  listHideRowActions?: boolean
}

export function EntityDataTableGrid({
  table,
  entitySlug,
  listCols,
  previewColumnCount,
  renderCustomItem,
  listHideRowActions = false,
}: EntityDataTableGridProps) {
  const rows = table.getRowModel().rows
  const previewKeys = adminEntityListGridPreviewColumnKeys(
    table,
    previewColumnCount,
  )
  const labelByKey = new Map(listCols.map((c) => [c.key, c.label] as const))

  return (
    <AdminListRowRenderModeProvider mode="grid">
    <div
      className="grid min-w-0 grid-cols-1 gap-4 px-4 py-3 sm:grid-cols-2 xl:grid-cols-3"
      data-testid={`admin-entity-grid--${entitySlug}`}
    >
      {rows.map((row) => {
        const actionsCell = listHideRowActions
          ? undefined
          : cellForColumn(row, "actions")

        const customBody =
          renderCustomItem != null
            ? renderCustomItem({
                slug: entitySlug,
                row: row.original,
                table,
                previewColumnKeys: previewKeys,
              })
            : null

        return (
          <article
            key={row.id}
            className={cn(
              "flex min-h-0 min-w-0 flex-col rounded-lg border border-border/80 bg-card/90 shadow-sm",
            )}
            data-testid={`admin-entity-grid-item--${entitySlug}--${row.id}`}
          >
            <div className="min-w-0 flex-1 space-y-2 p-4">
              {renderCustomItem != null
                ? customBody
                : previewKeys.map((key) => {
                    const cell = cellForColumn(row, key)
                    const label = labelByKey.get(key) ?? key
                    const field = listCols.find((c) => c.key === key)
                    const stackAlign = gridPreviewStackAlignClass(field)
                    const valueExtras = gridPreviewValueExtraClass(field)
                    if (!cell) {
                      return (
                        <div
                          key={key}
                          className={cn("min-w-0 text-sm", stackAlign)}
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                          <p className={cn("mt-0.5 text-foreground", valueExtras)}>
                            —
                          </p>
                        </div>
                      )
                    }
                    return (
                      <div
                        key={key}
                        className={cn("min-w-0 text-sm", stackAlign)}
                      >
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {label}
                        </p>
                        <div
                          className={cn(
                            "mt-0.5 min-w-0 break-words font-medium text-foreground [overflow-wrap:anywhere]",
                            valueExtras,
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      </div>
                    )
                  })}
            </div>
            {!listHideRowActions && actionsCell ? (
              <div
                className="flex shrink-0 justify-end gap-2 border-t border-border/70 bg-muted/20 px-3 py-2"
                data-testid={`admin-entity-grid-item-actions--${entitySlug}--${row.id}`}
              >
                {flexRender(
                  actionsCell.column.columnDef.cell,
                  actionsCell.getContext(),
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
    </AdminListRowRenderModeProvider>
  )
}
