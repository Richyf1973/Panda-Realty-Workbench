"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"

import type { MeetingReminder } from "@/lib/reminder-types"

export type ReminderUnit = "minutes" | "hours" | "days" | "weeks"
export type ReminderMethod = "popup" | "email"

export interface ReminderRow {
  method: ReminderMethod
  value: string
  unit: ReminderUnit
}

export const UNIT_MULTIPLIERS: Record<ReminderUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
}

export function toMinutes(value: string, unit: ReminderUnit): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * UNIT_MULTIPLIERS[unit])
}

export function rowsToReminders(rows: ReminderRow[]): MeetingReminder[] {
  return rows
    .filter((r) => r.value !== "" && Number(r.value) >= 0)
    .map((r) => ({ method: r.method, minutes: toMinutes(r.value, r.unit) }))
}

export function remindersToRows(reminders: MeetingReminder[]): ReminderRow[] {
  return reminders.map((r) => {
    for (const unit of ["weeks", "days", "hours"] as ReminderUnit[]) {
      const multiplier = UNIT_MULTIPLIERS[unit]
      if (r.minutes % multiplier === 0 && r.minutes / multiplier >= 1) {
        return { method: r.method, value: String(r.minutes / multiplier), unit }
      }
    }
    return { method: r.method, value: String(r.minutes), unit: "minutes" }
  })
}

export const DEFAULT_REMINDERS: ReminderRow[] = [
  { method: "popup", value: "1", unit: "hours" },
  { method: "popup", value: "1", unit: "days" },
]

export function ReminderRows({
  rows,
  onChange,
}: {
  rows: ReminderRow[]
  onChange: (rows: ReminderRow[]) => void
}) {
  function update(i: number, patch: Partial<ReminderRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-2">
      <Label>Reminders</Label>
      {rows.map((row, i) => (
        <div key={i} data-testid="reminder-row" className="flex items-center gap-2">
          <Select value={row.method} onValueChange={(v) => update(i, { method: v as ReminderMethod })}>
            <SelectTrigger data-testid="reminder-method-select" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popup">Notification</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Input
            data-testid="reminder-value-input"
            type="number"
            min={0}
            step={1}
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
            className="w-20"
          />
          <Select value={row.unit} onValueChange={(v) => update(i, { unit: v as ReminderUnit })}>
            <SelectTrigger data-testid="reminder-unit-select" className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
              <SelectItem value="days">days</SelectItem>
              <SelectItem value="weeks">weeks</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-testid="reminder-remove-btn"
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { method: "popup", value: "30", unit: "minutes" }])}
        className="gap-1"
      >
        <Plus className="size-3.5" />
        Add notification
      </Button>
    </div>
  )
}
