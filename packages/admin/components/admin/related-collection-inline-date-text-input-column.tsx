"use client"

import type { ReactNode } from "react"

import { relatedInlineDateStringCalendarRequired } from "../../admin-entity-crud-related-inline-helpers"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import type {
  AdminEntityColumn,
  AdminEntityCrudRelatedCollectionTable,
} from "../../admin-entity-types"
import { AdminEntityCrudDateStringCalendarControl } from "./admin-entity-crud-date-string-calendar-control"
import { AdminEntityCrudDateStringYearMonthControl } from "./admin-entity-crud-date-string-year-month-control"
import { AdminEntityCrudDateStringTextInputControl } from "./admin-entity-crud-date-string-text-input-control"

export type RelatedInlineDateCellArgs = {
  col: AdminEntityColumn
  line: LineRow
  key: string
  value: string
  viewRo: boolean
  variant: "create" | "edit"
  parentSlug: string
  collection: AdminEntityCrudRelatedCollectionTable
  updateLineRef: { current: (clientKey: string, patch: Record<string, unknown>) => void }
}

export function renderRelatedInlineDateCell(
  args: RelatedInlineDateCellArgs,
): ReactNode {
  const {
    col,
    line,
    key,
    value,
    viewRo,
    variant,
    parentSlug,
    collection,
    updateLineRef,
  } = args

  if (col.dateStringFormControl === "yearMonthEnd") {
    return (
      <AdminEntityCrudDateStringYearMonthControl
        variant={variant}
        slug={collection.childEntitySlug}
        col={col}
        htmlForId={`related-year-month-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
        value={value}
        onChange={(v) => updateLineRef.current(line.clientKey, { [key]: v })}
        onBlur={() => {}}
        required={relatedInlineDateStringCalendarRequired(col, variant)}
        readOnly={viewRo}
      />
    )
  }

  if (col.dateStringFormControl === "calendar") {
    return (
      <AdminEntityCrudDateStringCalendarControl
        variant={variant}
        slug={collection.childEntitySlug}
        col={col}
        htmlForId={`related-date-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
        value={value}
        onChange={(v) => updateLineRef.current(line.clientKey, { [key]: v })}
        onBlur={() => {}}
        required={relatedInlineDateStringCalendarRequired(col, variant)}
        readOnly={viewRo}
        relatedInlineArrowNavTarget={viewRo !== true}
      />
    )
  }

  if (col.dateStringFormControl === "textInput") {
    return (
      <AdminEntityCrudDateStringTextInputControl
        variant={variant}
        slug={collection.childEntitySlug}
        col={col}
        htmlForId={`related-date-text-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
        value={value}
        onChange={(v) => updateLineRef.current(line.clientKey, { [key]: v })}
        onBlur={() => {}}
        required={relatedInlineDateStringCalendarRequired(col, variant)}
        readOnly={viewRo}
        relatedInlineArrowNavTarget={viewRo !== true}
      />
    )
  }

  return null
}
