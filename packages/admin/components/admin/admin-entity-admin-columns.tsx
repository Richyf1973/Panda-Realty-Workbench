"use client"

import type {
  ColumnDef,
  HeaderContext,
  Row,
} from "@tanstack/react-table"

import { AdminEntityRowActionsLazy } from "./admin-entity-row-actions-lazy"
import type { AdminEntityRowActionDescriptor } from "./admin-entity-row-action-descriptor"
import { SortableColumnHeader } from "./sortable-column-header"
import { renderAdminEntityListCell } from "./admin-entity-list-cell-renderer"
import { buildLinksColumn } from "./admin-entity-links-column"
import { cellString } from "../../admin-entity-admin-cell"
import { formatAdminEntityListCellDisplay } from "../../admin-entity-list-display-format"
import { resolveAdminEntityCellAlign } from "../../admin-entity-list-cell"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import { cn } from "@repo/ui/utils"
import type { ReactNode } from "react"

export type AdminEntityAdminColumnsParams = {
  slug: AdminEntitySlug
  listCols: AdminEntityColumn[]
  idKey: string
  deleteLabelColumnKey: string
  /** Column def for `deleteLabelColumnKey` when list formatting (e.g. timestamps) should apply. */
  deleteLabelColumn?: AdminEntityColumn
  /** Sums over all list-filtered rows from GET list (`listAggregateSums`); not page-limited. */
  listAggregateSums?: Record<string, string>
  updatePending: boolean
  deletePending: boolean
  requestDeleteRow: (rowId: string, deleteLabel: string) => void
  startEdit: (row: AdminEntityTableRow) => void
  /** When true, omit the actions column (browse-only lists). */
  listHideRowActions?: boolean
  /** When true, single “view” action only (no delete); pairs with client registry `adminUiMutationsDisabled`. */
  rowActionsViewOnly?: boolean
  /**
   * Open another entity’s edit dialog (e.g. DR → Sales). Used with `listCellOpensRelatedAdminEdit`.
   */
  onOpenRelatedAdminEdit?: (
    relatedEntitySlug: AdminEntitySlug,
    relatedRowId: string,
  ) => void
  /**
   * When set, {@link AdminEntityColumn.listVirtualRelationLabel} values use the same format as the
   * related entity’s list columns (e.g. calendar dates).
   */
  adminEntities?: Readonly<Record<string, AdminEntityDefinition>>
  /**
   * When provided, renders an extra "links" column before the actions column.
   * Each item is an icon link (or disabled icon when `href` is null).
   */
  listRowLinksFirst?: boolean
  renderListRowLinks?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
  }) => readonly {
    readonly href: string | null
    readonly icon: ReactNode
    readonly tooltip: string
  }[] | null | undefined
  /** When provided, renders extra action buttons before the standard edit/delete controls. */
  renderListRowExtraActions?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
  }) => ReactNode
  /** When provided, renders structured pinned + collapsible row actions (responsive overflow menu). */
  renderListRowActions?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
  }) => {
    readonly pinned?: ReactNode
    readonly collapsible?: AdminEntityRowActionDescriptor[]
    /** Render only `pinned` — no Edit/Delete/overflow (e.g. browse-only map results rows). */
    readonly pinnedOnly?: boolean
  } | null
}

export function buildAdminEntityAdminColumns({
  slug,
  listCols,
  idKey,
  deleteLabelColumnKey,
  deleteLabelColumn,
  listAggregateSums,
  updatePending,
  deletePending,
  requestDeleteRow,
  startEdit,
  listHideRowActions = false,
  rowActionsViewOnly = false,
  onOpenRelatedAdminEdit,
  adminEntities,
  listRowLinksFirst,
  renderListRowLinks,
  renderListRowExtraActions,
  renderListRowActions,
}: AdminEntityAdminColumnsParams): ColumnDef<AdminEntityTableRow>[] {
  const showAggregateFooter =
    listAggregateSums != null && Object.keys(listAggregateSums).length > 0

  const dataColumns = listCols.map((field, colIndex) => {
      const cellAlign = resolveAdminEntityCellAlign(field)
      const headerAlignWrap =
        cellAlign === "center"
          ? "flex justify-center"
          : cellAlign === "right"
            ? "flex justify-end"
            : null

      return {
        accessorKey: field.key,
        meta: {
          cellAlign,
          ...(field.listColumnMinWidthPx != null
            ? { listColumnMinWidthPx: field.listColumnMinWidthPx }
            : {}),
          ...(field.listColumnMaxWidthPx != null
            ? { listColumnMaxWidthPx: field.listColumnMaxWidthPx }
            : {}),
          ...(field.listColumnWrapMaxWidthPx != null
            ? { listColumnWrapMaxWidthPx: field.listColumnWrapMaxWidthPx }
            : {}),
          ...(field.listColumnWrapMaxLines != null
            ? { listColumnWrapMaxLines: field.listColumnWrapMaxLines }
            : {}),
          ...(showAggregateFooter && colIndex === 0
            ? { footerColSpan: 2 as const }
            : {}),
        },
        header: (ctx: HeaderContext<AdminEntityTableRow, unknown>) => {
          const sortHeader = (
            <SortableColumnHeader
              column={ctx.column}
              label={field.label}
              testId={`admin-entity-sort-header--${slug}--${field.key}`}
              className={headerAlignWrap ? "ml-0" : undefined}
            />
          )
          const plainHeader = (
            <span data-testid={`admin-entity-col-label--${slug}--${field.key}`}>
              {field.label}
            </span>
          )
          if (field.sortable) {
            const inner = headerAlignWrap ? (
              <div className={headerAlignWrap}>{sortHeader}</div>
            ) : (
              sortHeader
            )
            return inner
          }
          if (headerAlignWrap) {
            return (
              <div className={headerAlignWrap}>
                {plainHeader}
              </div>
            )
          }
          return plainHeader
        },
        cell: ({ row }: { row: Row<AdminEntityTableRow> }) =>
          renderAdminEntityListCell({
            field,
            row,
            idKey,
            slug,
            cellAlign,
            onOpenRelatedAdminEdit,
            adminEntities,
            listCols,
          }),
        footer:
          showAggregateFooter && colIndex === 0
            ? () => (
                <span
                  className="whitespace-nowrap text-muted-foreground"
                  data-testid={`admin-entity-footer-total-label--${slug}`}
                >
                  Period total
                </span>
              )
            : showAggregateFooter &&
                listAggregateSums != null &&
                Object.hasOwn(listAggregateSums, field.key) &&
                (field.valueType === "numeric" || field.valueType === "integer")
              ? () => {
                  const raw = listAggregateSums[field.key]
                  const text = formatAdminEntityListCellDisplay(raw, field)
                  return (
                    <span
                      className={cn(
                        "whitespace-nowrap tabular-nums font-medium",
                        field.monospace && "font-mono text-sm",
                      )}
                      data-testid={`admin-entity-footer-sum--${slug}--${field.key}`}
                    >
                      {text}
                    </span>
                  )
                }
              : undefined,
        enableSorting: field.sortable,
      }
    })

  if (listHideRowActions) return dataColumns

  const linksColumn: ColumnDef<AdminEntityTableRow> | null = renderListRowLinks
    ? buildLinksColumn({ slug, showAggregateFooter, renderListRowLinks })
    : null

  return [
    ...(linksColumn && listRowLinksFirst ? [linksColumn] : []),
    ...dataColumns,
    ...(linksColumn && !listRowLinksFirst ? [linksColumn] : []),
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      footer: showAggregateFooter ? () => null : undefined,
      enableSorting: false,
      cell: ({ row }: { row: Row<AdminEntityTableRow> }) => {
        const rowId = String(row.original[idKey])
        const deleteRaw = row.original[deleteLabelColumnKey]
        const deleteLabel = deleteLabelColumn
          ? formatAdminEntityListCellDisplay(deleteRaw, deleteLabelColumn)
          : cellString(deleteRaw)

        const structuredActions = renderListRowActions
          ? renderListRowActions({ slug, row: row.original })
          : null
        const extraActions =
          structuredActions == null && renderListRowExtraActions
            ? renderListRowExtraActions({ slug, row: row.original })
            : undefined

        return (
          <AdminEntityRowActionsLazy
            entitySlug={slug}
            rowId={rowId}
            updatePending={updatePending}
            deletePending={deletePending}
            disableEdit={deletePending || updatePending}
            viewOnly={rowActionsViewOnly}
            onStartEdit={() => startEdit(row.original)}
            onDelete={() => requestDeleteRow(rowId, deleteLabel)}
            extraActions={extraActions}
            pinnedActions={structuredActions?.pinned}
            collapsibleActions={structuredActions?.collapsible}
            pinnedOnly={structuredActions?.pinnedOnly}
          />
        )
      },
    },
  ]
}
