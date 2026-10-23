"use client"

import type { Row } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { Mail, Phone, CircleCheck } from "lucide-react"

import { formatAdminEntityListCellDisplay } from "../../admin-entity-list-display-format"
import { adminEntityListCellHiddenBySiblings, coerceBooleanLike } from "../../admin-entity-list-cell"
import type { AdminCellAlign } from "../../admin-entity-types"
import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/tooltip"
import { cn } from "@repo/ui/utils"
import { renderBooleanCell } from "./admin-entity-list-cell-boolean"
import { renderBadgeCell } from "./admin-entity-list-cell-badge"
import { renderRelationCell } from "./admin-entity-list-cell-relation"
import { AdminEntityListImageCell } from "./admin-entity-list-cell-image"

/** A jsonb column typed as `text`: the API delivers a parsed array of strings for display. */
function asStringList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const items = raw
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter((s) => s !== "")
  return items.length > 0 ? items : null
}

export type RenderAdminEntityListCellParams = {
  field: AdminEntityColumn
  row: Row<AdminEntityTableRow>
  idKey: string
  slug: AdminEntitySlug
  cellAlign: AdminCellAlign
  onOpenRelatedAdminEdit?: (relatedEntitySlug: AdminEntitySlug, relatedRowId: string) => void
  adminEntities?: Readonly<Record<string, AdminEntityDefinition>>
  listCols: AdminEntityColumn[]
}

export function renderAdminEntityListCell({
  field,
  row,
  idKey,
  slug,
  cellAlign,
  onOpenRelatedAdminEdit,
  adminEntities,
  listCols,
}: RenderAdminEntityListCellParams): ReactNode {
  const rowId = String(row.original[idKey])
  // Presentational per-row blank: a preferred sibling figure (e.g. contract/appraised price) is
  // present, so this fallback cell renders empty. Underlying data is untouched.
  const raw = adminEntityListCellHiddenBySiblings(row.original, field)
    ? null
    : row.original[field.key]

  const boolCell = renderBooleanCell({ field, raw, rowId, slug })
  if (boolCell !== null) return boolCell

  const badgeCell = renderBadgeCell({ field, raw, rowId, slug, cellAlign })
  if (badgeCell !== null) return badgeCell

  const relationCell = renderRelationCell({
    field, row, raw, rowId, slug, onOpenRelatedAdminEdit, adminEntities, listCols,
  })
  if (relationCell !== null) return relationCell

  if (field.listVirtual && field.listCellOpensRelatedAdminEdit && onOpenRelatedAdminEdit) {
    const openSpec = field.listCellOpensRelatedAdminEdit
    const text = formatAdminEntityListCellDisplay(raw, field)
    const ridRaw = row.original[openSpec.relatedRowIdColumnKey]
    const rid = ridRaw != null ? String(ridRaw).trim() : ""
    const canOpen = rid !== ""
    // Opt-in empty state: render meaningful muted text instead of a dead disabled button.
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
        {text.trim() !== "" ? text : "—"}
      </button>
    )
  }

  if (field.listCellImage) {
    const url = typeof raw === "string" ? raw : ""
    const altKey = field.listCellImage.altColumnKey
    const altRaw = altKey != null ? row.original[altKey] : undefined
    const alt = altRaw != null ? String(altRaw).trim() : ""
    return (
      <AdminEntityListImageCell
        src={url}
        alt={alt}
        testId={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      />
    )
  }

  if (field.listCellJsonStringList) {
    const items = asStringList(raw)
    if (items) {
      return (
        <ul
          className={cn(
            "m-0 list-disc space-y-0.5 pl-4",
            field.monospace && "font-mono text-sm",
          )}
          data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
        >
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    }
    // Non-array (e.g. a plain string or empty) → fall through to normal text rendering below.
  }

  const text = formatAdminEntityListCellDisplay(raw, field)

  const affix = field.listCellAffixWhenTrue
  if (affix) {
    const sourceRaw = row.original[affix.sourceColumnKey]
    const showAffix =
      sourceRaw != null && sourceRaw !== "" && coerceBooleanLike(sourceRaw) !== false
    return (
      <span
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5",
          field.valueType === "numeric" && "tabular-nums",
          !field.monospace && "font-medium",
          field.monospace && "font-mono text-sm",
        )}
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
      >
        <span className="min-w-0 truncate">{text}</span>
        {showAffix ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex shrink-0 cursor-default text-emerald-600 dark:text-emerald-500"
                data-testid={`admin-entity-row-cell-affix--${slug}--${rowId}--${field.key}--when-true`}
                aria-label={affix.ariaLabel ?? affix.tooltip}
              >
                <CircleCheck className="size-4" strokeWidth={2.25} aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>{affix.tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
    )
  }

  if (field.listCellLinkType) {
    const rawStr = typeof raw === "string" ? raw.trim() : ""
    if (rawStr) {
      const isPhone = field.listCellLinkType === "tel"
      return (
        <a
          href={`${field.listCellLinkType}:${rawStr}`}
          className={cn(
            "inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors",
            field.monospace && "font-mono text-sm",
          )}
          data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isPhone ? <Phone className="size-3 shrink-0" /> : <Mail className="size-3 shrink-0" />}
          <span className="truncate">{text}</span>
        </a>
      )
    }
  }

  return (
    <span
      className={cn(
        field.listColumnWrapMaxWidthPx != null && "block min-w-0 max-w-full",
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
