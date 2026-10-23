"use client"

import { useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Calendar } from "@repo/ui/calendar"
import { Label } from "@repo/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/popover"
import { cn } from "@repo/ui/utils"

import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { toIsoLocalDate as toIsoLocal } from "../../admin-entity-list-date-local"

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addLocalDays(base: Date, delta: number): Date {
  const x = new Date(base)
  x.setDate(x.getDate() + delta)
  return x
}

function parseIsoToLocalDate(iso: string): Date | undefined {
  const t = iso.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (!m) return undefined
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return undefined
  }
  return dt
}

function formatShort(iso: string): string {
  const dt = parseIsoToLocalDate(iso)
  if (!dt) return iso
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function rangeToday(): { from: string; to: string } {
  const t = startOfLocalDay(new Date())
  const s = toIsoLocal(t)
  return { from: s, to: s }
}

function rangeYesterday(): { from: string; to: string } {
  const t = addLocalDays(startOfLocalDay(new Date()), -1)
  const s = toIsoLocal(t)
  return { from: s, to: s }
}

/** Monday–Sunday (local). */
function rangeThisWeek(): { from: string; to: string } {
  const today = startOfLocalDay(new Date())
  const day = today.getDay()
  const offsetMon = day === 0 ? -6 : 1 - day
  const mon = addLocalDays(today, offsetMon)
  const sun = addLocalDays(mon, 6)
  return { from: toIsoLocal(mon), to: toIsoLocal(sun) }
}

function rangeThisMonth(): { from: string; to: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toIsoLocal(start), to: toIsoLocal(end) }
}

function rangePreviousMonth(): { from: string; to: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: toIsoLocal(start), to: toIsoLocal(end) }
}

function rangeThisYear(): { from: string; to: string } {
  const y = new Date().getFullYear()
  const start = new Date(y, 0, 1)
  const end = new Date(y, 11, 31)
  return { from: toIsoLocal(start), to: toIsoLocal(end) }
}

/** `from` = today − 6 calendar months, `to` = today. */
function rangeLast6Months(): { from: string; to: string } {
  const today = startOfLocalDay(new Date())
  const from = new Date(today)
  from.setMonth(from.getMonth() - 6)
  return { from: toIsoLocal(from), to: toIsoLocal(today) }
}

const PRESETS = [
  { id: "today" as const, label: "Today", range: rangeToday },
  { id: "yesterday" as const, label: "Yesterday", range: rangeYesterday },
  { id: "thisWeek" as const, label: "This week", range: rangeThisWeek },
  { id: "thisMonth" as const, label: "This month", range: rangeThisMonth },
  {
    id: "previousMonth" as const,
    label: "Previous month",
    range: rangePreviousMonth,
  },
  { id: "last6Months" as const, label: "Last 6 months", range: rangeLast6Months },
  { id: "thisYear" as const, label: "This year", range: rangeThisYear },
]

type AdminEntityListDateRangePickerProps = {
  slug: AdminEntitySlug
  /** When set, disambiguates `data-testid` / trigger ids for multiple pickers on one list. */
  scopeColumnKey?: string
  filterLabel: string
  valueFrom: string
  valueTo: string
  onChange: (from: string, to: string) => void
  /** Tighter label + trigger (e.g. mobile filter dialog). */
  compact?: boolean
}

export function AdminEntityListDateRangePicker({
  slug,
  scopeColumnKey,
  filterLabel,
  valueFrom,
  valueTo,
  onChange,
  compact = false,
}: AdminEntityListDateRangePickerProps) {
  const scope = scopeColumnKey != null && scopeColumnKey !== "" ? scopeColumnKey : null
  const testScope = scope == null ? slug : `${slug}--${scope}`
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const f = valueFrom.trim()
    const t = valueTo.trim()
    if (!f || !t) return undefined
    const df = parseIsoToLocalDate(f)
    const dt = parseIsoToLocalDate(t)
    if (!df || !dt) return undefined
    return { from: df, to: dt }
  })

  useEffect(() => {
    const f = valueFrom.trim()
    const t = valueTo.trim()
    if (!f || !t) {
      setRange(undefined)
      return
    }
    const df = parseIsoToLocalDate(f)
    const dt = parseIsoToLocalDate(t)
    if (!df || !dt) {
      setRange(undefined)
      return
    }
    setRange({ from: df, to: dt })
  }, [valueFrom, valueTo])

  const triggerSummary = useMemo(() => {
    const f = valueFrom.trim()
    const t = valueTo.trim()
    if (!f || !t) return "All dates"
    return `${formatShort(f)} – ${formatShort(t)}`
  }, [valueFrom, valueTo])

  const defaultMonth = range?.from ?? range?.to ?? new Date()

  return (
    <div
      className={cn("flex min-w-0 flex-col", compact ? "gap-1" : "gap-1.5")}
      data-testid={`admin-entity-list-date-range--${testScope}`}
    >
      <Label
        htmlFor={`admin-entity-list-date-range-trigger--${testScope}`}
        className={cn(
          "font-normal text-muted-foreground",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {filterLabel}
      </Label>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            id={`admin-entity-list-date-range-trigger--${testScope}`}
            type="button"
            variant="outline"
            size={compact ? "default" : "lg"}
            className={cn(
              "min-w-44 justify-start gap-2 px-3 text-left font-normal",
              compact
                ? "h-8 min-h-8 text-xs"
                : "h-9 text-sm",
            )}
            data-testid={`admin-entity-list-date-range-trigger--${testScope}`}
            aria-label={`${filterLabel}: ${triggerSummary}`}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerSummary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[min(100vw-1.5rem,44rem)] p-0"
          align="start"
        >
          <div className="flex flex-col gap-0">
            <div className="grid grid-cols-2 gap-1.5 border-b border-border p-2 sm:grid-cols-3">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs font-normal"
                  data-testid={`admin-entity-list-date-range-preset--${testScope}--${p.id}`}
                  onClick={() => {
                    const { from, to } = p.range()
                    onChange(from, to)
                    setRange({
                      from: parseIsoToLocalDate(from),
                      to: parseIsoToLocalDate(to),
                    })
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                mode="range"
                defaultMonth={defaultMonth}
                numberOfMonths={2}
                selected={range}
                onSelect={(next) => {
                  setRange(next)
                  if (next?.from && next.to) {
                    onChange(toIsoLocal(next.from), toIsoLocal(next.to))
                  }
                }}
              />
            </div>
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                data-testid={`admin-entity-list-date-range-clear--${testScope}`}
                onClick={() => {
                  onChange("", "")
                  setRange(undefined)
                }}
              >
                Clear range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
