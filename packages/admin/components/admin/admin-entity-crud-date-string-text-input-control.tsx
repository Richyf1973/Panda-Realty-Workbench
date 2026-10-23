"use client"

import * as React from "react"

import { Input } from "@repo/ui/input"
import { cn } from "@repo/ui/utils"

import {
  adminEntityDateStringAutoFormatInput,
  adminEntityDateStringExpandShortDate,
  adminEntityDateStringMdyToYmd,
  adminEntityDateStringYmdToMdy,
} from "../../admin-entity-crud-date-string-form"
import { ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE } from "../../admin-entity-crud-autocomplete-suppress"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"
import { adminRelatedInlineNavTargetDomProps } from "../../admin-related-inline-table-arrow-navigation"
import { adminSelectAllOnInputFocus } from "../../admin-select-all-on-input-focus"

export function AdminEntityCrudDateStringTextInputControl({
  variant,
  slug,
  col,
  htmlForId,
  value,
  onChange,
  onBlur,
  required,
  readOnly,
  relatedInlineArrowNavTarget = false,
  inputClassName,
}: {
  variant: "create" | "edit"
  slug: AdminEntitySlug
  col: AdminEntityColumn
  htmlForId: string
  /** Form state value — always stored as `YYYY-MM-DD`. */
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  required: boolean
  readOnly?: boolean
  relatedInlineArrowNavTarget?: boolean
  inputClassName?: string
}) {
  const testIdPrefix = variant === "create" ? "admin-entity-create" : "admin-entity-edit"
  const testId = `${testIdPrefix}-date-text--${slug}--${col.key}`

  // Display state is MM/DD/YYYY; form state is YYYY-MM-DD.
  const [display, setDisplay] = React.useState(() => adminEntityDateStringYmdToMdy(value))

  // Sync display when the external value changes (e.g. form reset).
  const prevValueRef = React.useRef(value)
  if (prevValueRef.current !== value) {
    prevValueRef.current = value
    const synced = adminEntityDateStringYmdToMdy(value)
    if (synced !== display) setDisplay(synced)
  }

  const handleChange = (raw: string) => {
    const formatted = adminEntityDateStringAutoFormatInput(raw)
    setDisplay(formatted)
    const ymd = adminEntityDateStringMdyToYmd(formatted)
    if (ymd != null) onChange(ymd)
    else if (!formatted.trim()) onChange("")
  }

  const handleBlur = () => {
    const expanded = adminEntityDateStringExpandShortDate(display)
    const ymd = adminEntityDateStringMdyToYmd(expanded)
    if (ymd != null) {
      onChange(ymd)
      setDisplay(adminEntityDateStringYmdToMdy(ymd))
    } else if (!expanded.trim()) {
      onChange("")
    } else if (expanded !== display) {
      // Expansion produced a string but it's not a valid date (e.g. 02/31/2026) —
      // show the expanded form so the user can see and correct it
      setDisplay(expanded)
    }
    onBlur()
  }

  const navProps = relatedInlineArrowNavTarget
    ? adminRelatedInlineNavTargetDomProps(testId)
    : { "data-testid": testId }

  return (
    <Input
      id={htmlForId}
      {...navProps}
      value={display}
      placeholder={col.placeholder ?? "MM/DD/YYYY"}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onFocus={readOnly === true ? undefined : adminSelectAllOnInputFocus}
      aria-required={required}
      autoComplete={ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE}
      inputMode="numeric"
      readOnly={readOnly === true}
      aria-readonly={readOnly === true ? true : undefined}
      className={cn(inputClassName, col.inputClassName, readOnly === true && "bg-muted/30")}
    />
  )
}
