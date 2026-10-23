"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Calendar } from "@repo/ui/calendar"
import { Input } from "@repo/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/popover"
import { cn } from "@repo/ui/utils"

import {
  adminEntityDateStringCalendarSelectionToYmd,
  adminEntityDateStringFormStringToPickerDate,
  formatAdminEntityDateStringYmdForDisplay,
} from "../../admin-entity-crud-date-string-form"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"
import { adminRelatedInlineNavTargetDomProps } from "../../admin-related-inline-table-arrow-navigation"

export function AdminEntityCrudDateStringCalendarControl({
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
}: {
  variant: "create" | "edit"
  slug: AdminEntitySlug
  col: AdminEntityColumn
  htmlForId: string
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  required: boolean
  /** Copy-friendly read-only (no calendar popover). */
  readOnly?: boolean
  relatedInlineArrowNavTarget?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const testIdPrefix =
    variant === "create" ? "admin-entity-create" : "admin-entity-edit"
  const allowEmpty =
    variant === "create"
      ? Boolean(col.optionalOnCreate)
      : Boolean(col.patchEmptyClears)

  const selected = React.useMemo(
    () => adminEntityDateStringFormStringToPickerDate(value),
    [value],
  )

  const labelText = (() => {
    const t = value.trim()
    if (!t) return required ? "Pick a date" : "None"
    return formatAdminEntityDateStringYmdForDisplay(t)
  })()

  if (readOnly === true) {
    const displayValue = value.trim()
      ? formatAdminEntityDateStringYmdForDisplay(value)
      : ""
    return (
      <Input
        id={htmlForId}
        readOnly
        value={displayValue}
        data-testid={`${testIdPrefix}-date-picker--${slug}--${col.key}`}
        className="h-9 w-full bg-muted/30"
        aria-readonly
        aria-required={required}
      />
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={htmlForId}
          type="button"
          variant="outline"
          {...(relatedInlineArrowNavTarget
            ? adminRelatedInlineNavTargetDomProps(
                `${testIdPrefix}-date-picker--${slug}--${col.key}`,
              )
            : {
                "data-testid": `${testIdPrefix}-date-picker--${slug}--${col.key}`,
              })}
          className={cn(
            "h-9 w-full justify-start gap-2 px-2.5 font-normal",
            !value.trim() && "text-muted-foreground",
          )}
          aria-required={required}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {labelText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-100 w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d == null) {
              if (allowEmpty) onChange("")
              return
            }
            onChange(adminEntityDateStringCalendarSelectionToYmd(d))
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
