"use client"

import type { Row } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { cn } from "@repo/ui/utils"

import { cellString } from "../../admin-entity-admin-cell"
import { formatAdminEntityListCellDisplay } from "../../admin-entity-list-display-format"
import {
  formatAdminEntityVirtualRelationLabelValue,
  resolveRelatedColumnForVirtualRelationLabel,
} from "../../admin-entity-list-virtual-relation-label-format"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"

type RelationCellParams = {
  field: AdminEntityColumn
  row: Row<AdminEntityTableRow>
  raw: unknown
  rowId: string
  slug: AdminEntitySlug
  onOpenRelatedAdminEdit?: (relatedEntitySlug: AdminEntitySlug, relatedRowId: string) => void
  adminEntities?: Readonly<Record<string, AdminEntityDefinition>>
  listCols: AdminEntityColumn[]
}

/**
 * Secondary-line text for a cell that opts into {@link AdminEntityColumn.listCellSecondaryFromRelation}:
 * pulls the source column's relation embed off the row and joins the chosen label keys, skipping empties.
 * Returns `""` when there is no embed / no value, so the caller renders a single-line cell.
 */
function resolveSecondaryFromRelation(
  field: AdminEntityColumn,
  row: Row<AdminEntityTableRow>,
  listCols: AdminEntityColumn[],
  slug: AdminEntitySlug,
  adminEntities?: Readonly<Record<string, AdminEntityDefinition>>,
): string {
  const spec = field.listCellSecondaryFromRelation
  if (!spec) return ""
  // The source column is often `list: false` (e.g. invoice name), so it is absent from `listCols`
  // (visible columns only). Resolve it from the full entity definition first, then fall back.
  const allCols = adminEntities?.[slug]?.columns
  const sourceCol =
    allCols?.find((c) => c.key === spec.sourceColumnKey) ??
    listCols.find((c) => c.key === spec.sourceColumnKey)
  const embedKey = sourceCol?.listRelation?.embedJsonKey
  if (!embedKey) return ""
  const embedded = row.original[embedKey] as Record<string, unknown> | null | undefined
  if (!embedded || typeof embedded !== "object" || Array.isArray(embedded)) return ""
  const separator = spec.separator ?? " · "
  return spec.labelColumnKeys
    .map((k) => cellString(embedded[k]))
    .filter((x) => x !== "")
    .join(separator)
}

export function renderRelationCell({
  field,
  row,
  raw,
  rowId,
  slug,
  onOpenRelatedAdminEdit,
  adminEntities,
  listCols,
}: RelationCellParams): ReactNode | null {
  if (field.listVirtualRelationLabel) {
    const { sourceColumnKey, labelColumnKeys } = field.listVirtualRelationLabel
    const src = listCols.find((c) => c.key === sourceColumnKey)
    const embedKey = src?.listRelation?.embedJsonKey
    let text = ""
    if (embedKey) {
      const embedded = row.original[embedKey] as Record<string, unknown> | null | undefined
      if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
        text = labelColumnKeys
          .map((k) => {
            const relatedCol =
              adminEntities != null
                ? resolveRelatedColumnForVirtualRelationLabel(
                    listCols,
                    adminEntities,
                    sourceColumnKey,
                    k,
                  )
                : undefined
            return formatAdminEntityVirtualRelationLabelValue(embedded[k], relatedCol)
          })
          .filter((x) => x !== "")
          .join(" · ")
      }
    }
    return (
      <span
        className={cn(!field.monospace && "font-medium", field.monospace && "font-mono text-sm")}
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      >
        {text}
      </span>
    )
  }

  if (field.listRelation) {
    const rel = field.listRelation
    const showStoredFk = rel.listCellShow === "storedFk"
    if (showStoredFk) {
      const text = formatAdminEntityListCellDisplay(raw, field)
      const openSpec = field.listCellOpensRelatedAdminEdit
      if (openSpec && onOpenRelatedAdminEdit) {
        const ridRaw = row.original[openSpec.relatedRowIdColumnKey]
        const rid = ridRaw != null ? String(ridRaw).trim() : ""
        const canOpen = rid !== ""
        if (!canOpen && openSpec.emptyLabel) {
          return (
            <span
              className={cn(
                "text-muted-foreground",
                field.valueType === "numeric" && "tabular-nums",
                !field.monospace && "font-medium",
                field.monospace && "font-mono text-sm",
              )}
              data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
            >
              {openSpec.emptyLabel}
            </span>
          )
        }
        return (
          <button
            type="button"
            disabled={!canOpen}
            className={cn(
              "max-w-full cursor-pointer text-left text-primary underline decoration-primary/70 underline-offset-2 transition-colors",
              "hover:text-primary/90 hover:decoration-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline disabled:opacity-60",
              field.valueType === "numeric" && "tabular-nums",
              !field.monospace && "font-medium",
              field.monospace && "font-mono text-sm",
            )}
            data-testid={`admin-entity-list-cell-open-related--${slug}--${field.key}`}
            aria-label={canOpen ? `Open ${openSpec.relatedEntitySlug} ${rid}` : undefined}
            onClick={() => {
              if (!canOpen) return
              void onOpenRelatedAdminEdit(openSpec.relatedEntitySlug as AdminEntitySlug, rid)
            }}
          >
            {text}
          </button>
        )
      }
      return (
        <span
          className={cn(
            field.valueType === "numeric" && "tabular-nums",
            !field.monospace && "font-medium",
            field.monospace && "font-mono text-sm",
          )}
          data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
        >
          {text}
        </span>
      )
    }
    const embedded = row.original[rel.embedJsonKey] as Record<string, unknown> | null | undefined
    const fromEmbed =
      embedded && typeof embedded === "object" && !Array.isArray(embedded)
        ? rel.labelColumnKeys
            .map((k) => cellString(embedded[k]))
            .filter((x) => x !== "")
            .join(" · ")
        : ""
    const text = fromEmbed !== "" ? fromEmbed : formatAdminEntityListCellDisplay(raw, field)
    if (field.listCellBadge) {
      const isEmpty = text.trim() === ""
      return (
        <span data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-none tracking-tight",
              isEmpty
                ? "border-transparent bg-muted text-muted-foreground"
                : "border-transparent bg-secondary text-secondary-foreground",
            )}
          >
            {isEmpty ? "None" : text}
          </span>
        </span>
      )
    }
    const primarySpan = (
      <span
        className={cn(
          field.valueType === "numeric" && "tabular-nums",
          !field.monospace && "font-medium",
          field.monospace && "font-mono text-sm",
        )}
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      >
        {text}
      </span>
    )
    const secondaryText = resolveSecondaryFromRelation(field, row, listCols, slug, adminEntities)
    if (secondaryText === "") return primarySpan
    return (
      <span className="flex min-w-0 flex-col">
        {primarySpan}
        <span
          className="text-xs text-muted-foreground"
          data-testid={`admin-entity-row-cell-secondary--${slug}--${rowId}--${field.key}`}
        >
          {secondaryText}
        </span>
      </span>
    )
  }

  if (field.listManyRelation) {
    const many = field.listManyRelation
    const embedded = row.original[many.embedJsonKey]
    let fromEmbed = ""
    if (Array.isArray(embedded)) {
      fromEmbed = embedded
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return ""
          const related = item[many.embedRelatedJsonKey] as Record<string, unknown> | undefined
          if (!related || typeof related !== "object") return ""
          return many.labelColumnKeys
            .map((k) => cellString(related[k]))
            .filter((x) => x !== "")
            .join(" · ")
        })
        .filter((x) => x !== "")
        .join(many.aggregateDelimiter ?? ", ")
    }
    const text = fromEmbed !== "" ? fromEmbed : formatAdminEntityListCellDisplay(raw, field)
    return (
      <span
        className={cn(
          field.valueType === "numeric" && "tabular-nums",
          !field.monospace && "font-medium",
          field.monospace && "font-mono text-sm",
        )}
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      >
        {text}
      </span>
    )
  }

  return null
}
