"use client"

import { useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"
import { cn } from "@repo/ui/utils"
import { Input } from "@repo/ui/input"

import {
  adminEntityYmdFromYearMonth,
} from "../../admin-entity-date-ymd-month-end"
import { formatAdminEntityDateStringYmdForDisplay } from "../../admin-entity-crud-date-string-form"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"

const MONTH_VALUES = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
] as const

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function buildYearNumbers(): number[] {
  const current = new Date().getFullYear()
  const top = current + 2
  const years: number[] = []
  for (let y = top; y >= 1990; y--) years.push(y)
  /** Far-future option for E2E / sentinel inventory periods (see Vibram unit-sole Playwright cleanup). */
  if (top < 2200) years.unshift(2200)
  return years
}

const YEAR_NUMBERS = buildYearNumbers()

function parseYmdToYearMonth(value: string): {
  year: string
  month: string
} | null {
  const t = value.trim()
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(t)
  if (!m) return null
  return { year: m[1], month: m[2] }
}

export function AdminEntityCrudDateStringYearMonthControl({
  variant,
  slug,
  col,
  htmlForId,
  value,
  onChange,
  /** Kept for API parity with other CRUD controls; not invoked on each Radix Select change (portal/focus noise). */
  onBlur: _onBlur,
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
  const testIdPrefix =
    variant === "create" ? "admin-entity-create" : "admin-entity-edit"
  const allowEmpty = variant === "create" ? col.optionalOnCreate === true : col.patchEmptyClears === true

  const ym = useMemo(() => parseYmdToYearMonth(value), [value])
  const year = ym?.year ?? ""
  const month = ym?.month ?? ""

  function commit(yearStr: string, monthStr: string) {
    if (!yearStr || !monthStr) {
      if (allowEmpty) onChange("")
      return
    }
    const ymd = adminEntityYmdFromYearMonth(`${yearStr}-${monthStr}`)
    if (ymd) onChange(ymd)
  }

  if (readOnly === true) {
    const displayValue = value.trim()
      ? formatAdminEntityDateStringYmdForDisplay(value)
      : ""
    return (
      <Input
        id={htmlForId}
        readOnly
        value={displayValue}
        data-testid={`${testIdPrefix}-year-month-readonly--${slug}--${col.key}`}
        className="h-9 w-full bg-muted/30"
        aria-readonly
        aria-required={required}
      />
    )
  }

  return (
    <div
      className={cn("flex flex-wrap gap-2")}
      data-testid={`${testIdPrefix}-year-month--${slug}--${col.key}`}
    >
      <Select
        value={month || undefined}
        onValueChange={(v) => {
          commit(year || String(new Date().getFullYear()), v)
        }}
      >
        <SelectTrigger
          id={htmlForId}
          className="h-9 min-w-[9.5rem] flex-1"
          aria-label={`${col.label} month`}
          aria-required={required}
        >
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_VALUES.map((mv, i) => (
            <SelectItem key={mv} value={mv}>
              {MONTH_LABELS[i]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={year || undefined}
        onValueChange={(v) => {
          commit(v, month || String(new Date().getMonth() + 1).padStart(2, "0"))
        }}
      >
        <SelectTrigger
          className="h-9 w-[5.5rem]"
          aria-label={`${col.label} year`}
          aria-required={required}
        >
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {YEAR_NUMBERS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
