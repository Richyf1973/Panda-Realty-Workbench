"use client"

import { useMemo } from "react"

import { Label } from "@repo/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { cn } from "@repo/ui/utils"

import { snapTimeToQuarterHour } from "@/lib/meeting-time-utils"

const EMPTY = "__none__"
const QUARTER_MINUTES = ["00", "15", "30", "45"] as const

function parseSnappedParts(value: string): { hour: string; minute: string } | null {
  const snapped = snapTimeToQuarterHour(value.trim())
  if (!snapped) return null
  const [h, m] = snapped.split(":")
  if (h == null || m == null) return null
  return { hour: String(Number(h)), minute: m }
}

export type QuarterHourTimeSelectProps = {
  value: string
  onChange: (next: string) => void
  optional?: boolean
  /** Shown above the selects (e.g. "Time" vs "Time (optional)"). */
  label: string
  labelId: string
  rootTestId: string
  hourSelectTestId: string
  minuteSelectTestId: string
  showHelperText?: boolean
  className?: string
}

export function QuarterHourTimeSelect({
  value,
  onChange,
  optional = false,
  label,
  labelId,
  rootTestId,
  hourSelectTestId,
  minuteSelectTestId,
  showHelperText = true,
  className,
}: QuarterHourTimeSelectProps) {
  const parts = useMemo(() => parseSnappedParts(value), [value])

  /** Required mode uses `undefined` when empty so Radix shows placeholder (no `__none__` item). */
  const hourSelectValue = optional ? (parts ? parts.hour : EMPTY) : parts ? parts.hour : undefined
  const minuteSelectValue = parts ? parts.minute : undefined

  function onHourChange(raw: string) {
    if (optional && raw === EMPTY) {
      onChange("")
      return
    }
    const minute = parts?.minute ?? "00"
    const h = Number(raw)
    const hh = String(h).padStart(2, "0")
    onChange(`${hh}:${minute}`)
  }

  function onMinuteChange(raw: string) {
    if (!parts) return
    const hh = String(Number(parts.hour)).padStart(2, "0")
    onChange(`${hh}:${raw}`)
  }

  const minuteDisabled = !parts

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label id={labelId}>{label}</Label>
      <div
        data-testid={rootTestId}
        role="group"
        aria-labelledby={labelId}
        className="flex gap-2"
      >
        <Select value={hourSelectValue} onValueChange={onHourChange}>
          <SelectTrigger
            id={`${labelId}-hour`}
            data-testid={hourSelectTestId}
            aria-label="Hour"
          >
            <SelectValue placeholder="Hour" />
          </SelectTrigger>
          <SelectContent>
            {optional ? (
              <SelectItem value={EMPTY}>No time</SelectItem>
            ) : null}
            {Array.from({ length: 24 }, (_, h) => (
              <SelectItem key={h} value={String(h)}>
                {String(h).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={minuteSelectValue} onValueChange={onMinuteChange} disabled={minuteDisabled}>
          <SelectTrigger
            id={`${labelId}-minute`}
            data-testid={minuteSelectTestId}
            aria-label="Minute"
          >
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {QUARTER_MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showHelperText ? (
        <p className="text-muted-foreground text-xs leading-snug">
          Times use 15-minute steps. If a value is off the grid, it adjusts to the nearest quarter hour when you save.
        </p>
      ) : null}
    </div>
  )
}
