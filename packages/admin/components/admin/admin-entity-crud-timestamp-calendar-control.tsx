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
  adminEntityTimestampCalendarSelectionToUtcIso,
  adminEntityTimestampFormStringToPickerDate,
} from "../../admin-entity-crud-timestamp-form"
import { formatAdminEntityTimestampCalendarLabelUtc } from "../../admin-entity-list-display-format"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"

export function AdminEntityCrudTimestampCalendarControl({
  variant,
  slug,
  col,
  htmlForId,
  value,
  onChange,
  onBlur,
  required,
  readOnly,
}: {
  variant: "create" | "edit"
  slug: AdminEntitySlug
  col: AdminEntityColumn
  htmlForId: string
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  required: boolean
  readOnly?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const testIdPrefix =
    variant === "create" ? "admin-entity-create" : "admin-entity-edit"
  const allowEmpty =
    variant === "create"
      ? Boolean(col.optionalOnCreate)
      : Boolean(col.patchEmptyClears)

  const selected = React.useMemo(
    () => adminEntityTimestampFormStringToPickerDate(value),
    [value],
  )

  const labelText = (() => {
    const t = value.trim()
    if (!t) return required ? "Pick a date" : "None"
    return formatAdminEntityTimestampCalendarLabelUtc(t, col)
  })()

  if (readOnly === true) {
    const displayValue = value.trim()
      ? formatAdminEntityTimestampCalendarLabelUtc(value, col)
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
          data-testid={`${testIdPrefix}-date-picker--${slug}--${col.key}`}
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
            onChange(adminEntityTimestampCalendarSelectionToUtcIso(d))
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
