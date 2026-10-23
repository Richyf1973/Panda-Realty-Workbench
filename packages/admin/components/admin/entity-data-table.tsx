"use client"

import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"
import { useCallback, useState, type ReactNode } from "react"

import { cn } from "@repo/ui/utils"
import { useAdminListClientHiddenRows } from "../../admin-list-client-hidden-rows-context"
import {
  AdminRowActionsCollapseProvider,
  useRowActionsCollapse,
} from "./admin-row-actions-collapse-context"
import {
  alignClassForColumn,
  listColumnBoundsCellClassName,
  listColumnBoundsStyle,
  rowHighlightClassName,
  rowHighlightLabels,
  stickyRightCellClassName,
  TABLE_CLASS,
  type EntityTableColumnMeta,
} from "./entity-data-table-helpers"
import { useStickyStartDecorators } from "./entity-data-table-sticky-start"
import type { AdminEntityListRowHighlight } from "../../admin-entity-types"
import { useEntityDataTableFooterSync } from "./use-entity-data-table-footer-sync"

type EntityDataTableProps<TData> = {
  table: TanStackTable<TData>
  /** Scopes data-testid values (e.g. admin entity slug). */
  entitySlug: string
  /**
   * When true and the table has footer groups, keeps the footer **below** the vertical scroll area
   * (docked above pagination). Syncs horizontal scroll and column widths with the body table.
   */
  dockAggregateFooter?: boolean
  /** Tighter `th`/`td` padding (e.g. Panda properties quick table). */
  compactCellPadding?: boolean
  /** Adds a subtle right border to each column to aid readability in wide tables. */
  showColumnDividers?: boolean
  /** When provided, clicking any body row calls this handler with the row's original data. */
  onRowClick?: (row: TData) => void
  /** Opt-in whole-row highlight driven by a boolean field on each row's original data. */
  listRowHighlight?: AdminEntityListRowHighlight
  /**
   * Freeze the leading columns up to **and including** this column key (see
   * {@link AdminEntityDefinition.listStickyStartColumnKey}). Frozen columns need fixed widths.
   */
  stickyStartColumnKey?: string
  /** Fixed px width of the leading row-links column when it is part of the frozen band. */
  stickyStartRowLinksWidthPx?: number
}

/**
 * TanStack may still expose footer *groups* when no column defines `footer`, which produced an
 * empty `<tfoot>` row (muted band above pagination). Only treat the table as having a footer when
 * at least one visible leaf column has an explicit footer renderer.
 */
function tableHasDefinedFooter<TData>(table: TanStackTable<TData>): boolean {
  return table.getVisibleLeafColumns().some((column) => {
    const f = column.columnDef.footer
    // TanStack types omit `false`; treat any non-nullish footer template as defined.
    return f != null
  })
}

export function EntityDataTable<TData>({
  table,
  entitySlug,
  dockAggregateFooter = false,
  compactCellPadding = false,
  showColumnDividers = false,
  onRowClick,
  listRowHighlight,
  stickyStartColumnKey,
  stickyStartRowLinksWidthPx,
}: EntityDataTableProps<TData>) {
  const { enabled: hideFromViewEnabled, isHidden } =
    useAdminListClientHiddenRows()
  const hasFooter = tableHasDefinedFooter(table)
  const dock = dockAggregateFooter && hasFooter
  const thPad = compactCellPadding ? "h-9 px-2 py-2" : "h-11 px-4"
  const tdPad = compactCellPadding ? "p-2" : "p-4"
  const tfootPad = compactCellPadding ? "h-9 px-2 py-2" : "h-11 px-4"
  const dividerClass =
    showColumnDividers ? "border-r border-border/40 last:border-r-0" : undefined

  const allRows = table.getRowModel().rows
  // Client-only "hide from view": drop rows the user ticked off (in-memory, table only).
  const visibleRows = hideFromViewEnabled
    ? allRows.filter((row) => !isHidden(row.id))
    : allRows
  const bodyRowCount = visibleRows.length
  const {
    bodyScrollRef,
    footerScrollRef,
    bodyTableRef,
    footerTableRef,
    onBodyScroll,
    onFooterScroll,
  } = useEntityDataTableFooterSync(dock, bodyRowCount)

  const { stickyStartClass, stickyStartStyle, frozenLeftWidth } =
    useStickyStartDecorators({
      table,
      stickyStartColumnKey,
      stickyStartRowLinksWidthPx,
    })

  // Row actions collapse to a single overflow menu when the table's own visible width leaves
  // too little room for data columns. The wrap div's parent is the horizontal scroll container
  // in both the docked and plain layouts, so its width reflects the side panel / sidebar state.
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const wrapRef = useCallback((el: HTMLDivElement | null) => {
    setScrollEl(el?.parentElement ?? null)
  }, [])
  const actionsCollapsed = useRowActionsCollapse(scrollEl, frozenLeftWidth)

  const thead = (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr
          key={headerGroup.id}
          className="sticky top-0 z-20 border-b border-border bg-muted shadow-sm"
          data-testid={`admin-entity-table-head-row--${entitySlug}`}
        >
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              scope="col"
              data-testid={`admin-entity-col-header--${entitySlug}--${header.column.id}`}
              className={cn(
                thPad,
                "align-middle font-medium",
                alignClassForColumn(header.column),
                listColumnBoundsCellClassName(
                  header.column.columnDef.meta as
                    | EntityTableColumnMeta
                    | undefined,
                ),
                dividerClass,
                header.column.id === "actions" &&
                  stickyRightCellClassName({
                    zClassName: "z-30",
                    surfaceClassName: "bg-muted",
                    isHeader: true,
                  }),
                stickyStartClass(header.column.id, "header"),
              )}
              style={stickyStartStyle(
                header.column.id,
                header.column.columnDef.meta as
                  | EntityTableColumnMeta
                  | undefined,
              )}
            >
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  )

  const tbody = (
    <tbody data-testid={`admin-entity-table-body--${entitySlug}`}>
      {visibleRows.map((row) => (
        <tr
          key={row.id}
          className={cn(
            "group border-b border-border last:border-0 hover:bg-muted/30",
            onRowClick != null && "cursor-pointer",
            rowHighlightClassName(row.original, listRowHighlight),
          )}
          data-testid={`admin-entity-row--${entitySlug}--${row.id}`}
          data-row-highlight-labels={rowHighlightLabels(row.original, listRowHighlight)}
          onClick={onRowClick != null ? () => onRowClick(row.original) : undefined}
        >
          {row.getVisibleCells().map((cell) => (
            <td
              key={cell.id}
              className={cn(
                tdPad,
                "align-middle",
                alignClassForColumn(cell.column),
                listColumnBoundsCellClassName(
                  cell.column.columnDef.meta as
                    | EntityTableColumnMeta
                    | undefined,
                ),
                dividerClass,
                cell.column.id === "actions" &&
                  stickyRightCellClassName({
                    zClassName: "z-10",
                    surfaceClassName:
                      "bg-card group-hover:bg-[color-mix(in_oklch,var(--muted)_30%,var(--card))]",
                  }),
                stickyStartClass(cell.column.id, "body"),
              )}
              style={stickyStartStyle(
                cell.column.id,
                cell.column.columnDef.meta as
                  | EntityTableColumnMeta
                  | undefined,
              )}
              onClick={
                onRowClick != null &&
                (cell.column.id === "actions" || cell.column.id === "row-links")
                  ? (e) => e.stopPropagation()
                  : undefined
              }
            >
              {flexRender(
                cell.column.columnDef.cell,
                cell.getContext(),
              )}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )

  const tfoot = hasFooter ? (
    <tfoot className={dock ? undefined : "sticky bottom-0 z-10"}>
      {table.getFooterGroups().map((footerGroup) => (
        <tr
          key={footerGroup.id}
          className="border-t border-border/80 bg-muted/95 font-medium shadow-[0_-4px_6px_-1px_rgb(0_0_0/0.06)] backdrop-blur-sm"
          data-testid={`admin-entity-table-footer-row--${entitySlug}`}
        >
          {(() => {
            const headers = footerGroup.headers
            const cells: ReactNode[] = []
            for (let hi = 0; hi < headers.length; ) {
              const footer = headers[hi]!
              if (footer.isPlaceholder) {
                hi += 1
                continue
              }
              const meta = footer.column.columnDef.meta as
                | EntityTableColumnMeta
                | undefined
              const rawSpan = meta?.footerColSpan ?? 1
              const span = Math.min(
                Math.max(1, rawSpan),
                headers.length - hi,
              )
              const colSpanProp = span > 1 ? span : undefined
              const boundsMeta = span === 1 ? meta : undefined
              cells.push(
                <td
                  key={footer.id}
                  colSpan={colSpanProp}
                  className={cn(
                    tfootPad,
                    "align-middle",
                    alignClassForColumn(footer.column),
                    listColumnBoundsCellClassName(boundsMeta),
                    footer.column.id === "actions" &&
                      stickyRightCellClassName({
                        zClassName: "z-30",
                        surfaceClassName: "bg-muted/95",
                        isHeader: true,
                        preserveBackdropBlur: true,
                      }),
                    span === 1 && stickyStartClass(footer.column.id, "footer"),
                  )}
                  style={
                    span === 1
                      ? stickyStartStyle(footer.column.id, boundsMeta)
                      : listColumnBoundsStyle(boundsMeta)
                  }
                  data-testid={
                    footer.column.id === "actions"
                      ? undefined
                      : `admin-entity-table-footer-cell--${entitySlug}--${footer.column.id}`
                  }
                >
                  {flexRender(
                    footer.column.columnDef.footer,
                    footer.getContext(),
                  )}
                </td>,
              )
              hi += span
            }
            return cells
          })()}
        </tr>
      ))}
    </tfoot>
  ) : null

  if (dock) {
    return (
      <AdminRowActionsCollapseProvider collapsed={actionsCollapsed}>
      <div
        ref={wrapRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        data-testid={`admin-entity-table-wrap--${entitySlug}`}
      >
        <div
          ref={bodyScrollRef}
          className="scrollbar-galaxy min-h-0 min-w-0 flex-1 overflow-auto"
          data-testid={`admin-entity-table-scroll--${entitySlug}`}
          onScroll={onBodyScroll}
        >
          <div className="min-w-0">
            <table
              ref={bodyTableRef}
              className={TABLE_CLASS}
              data-testid={`admin-entity-table--${entitySlug}`}
            >
              {thead}
              {tbody}
            </table>
          </div>
        </div>
        <div
          ref={footerScrollRef}
          className="scrollbar-galaxy shrink-0 overflow-x-auto border-t border-border/80 bg-muted/95 shadow-[0_-4px_6px_-1px_rgb(0_0_0/0.06)] backdrop-blur-sm"
          data-testid={`admin-entity-table-footer-scroll--${entitySlug}`}
          onScroll={onFooterScroll}
        >
          <table
            ref={footerTableRef}
            className={TABLE_CLASS}
            data-testid={`admin-entity-table-footer-table--${entitySlug}`}
          >
            {tfoot}
          </table>
        </div>
      </div>
      </AdminRowActionsCollapseProvider>
    )
  }

  return (
    <AdminRowActionsCollapseProvider collapsed={actionsCollapsed}>
    <div
      ref={wrapRef}
      className="min-w-0"
      data-testid={`admin-entity-table-wrap--${entitySlug}`}
    >
      <table
        className={TABLE_CLASS}
        data-testid={`admin-entity-table--${entitySlug}`}
      >
        {thead}
        {tbody}
        {tfoot}
      </table>
    </div>
    </AdminRowActionsCollapseProvider>
  )
}
