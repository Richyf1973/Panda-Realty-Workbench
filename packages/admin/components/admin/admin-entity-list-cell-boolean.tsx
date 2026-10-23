"use client"

import type { ReactNode } from "react"
import { Check, CircleCheck, X } from "lucide-react"

import {
  coerceBooleanLike,
  displayAdminEntityBoolean,
} from "../../admin-entity-list-cell"
import type { AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"

type BooleanCellParams = {
  field: AdminEntityColumn
  raw: unknown
  rowId: string
  slug: AdminEntitySlug
}

export function renderBooleanCell({
  field,
  raw,
  rowId,
  slug,
}: BooleanCellParams): ReactNode | null {
  if (field.listBooleanCircleCheckWhenTrue) {
    const isTrue = coerceBooleanLike(raw) === true || raw === true
    return (
      <span
        className="inline-flex items-center justify-center"
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
        aria-label={isTrue ? "True" : undefined}
      >
        {isTrue ? (
          <CircleCheck
            className="size-4 text-emerald-600 dark:text-emerald-500"
            aria-hidden
            strokeWidth={2.25}
          />
        ) : null}
      </span>
    )
  }

  const bool = displayAdminEntityBoolean(raw, field)
  if (bool !== null) {
    return (
      <span
        className="inline-flex items-center justify-center"
        data-testid={`admin-entity-row-cell--${slug}--${rowId}--${field.key}`}
        aria-label={bool ? "True" : "False"}
      >
        {bool ? (
          <Check
            className="size-4 text-emerald-600 dark:text-emerald-500"
            aria-hidden
            strokeWidth={2.5}
          />
        ) : (
          <X
            className="size-4 text-destructive"
            aria-hidden
            strokeWidth={2.5}
          />
        )}
      </span>
    )
  }

  return null
}
