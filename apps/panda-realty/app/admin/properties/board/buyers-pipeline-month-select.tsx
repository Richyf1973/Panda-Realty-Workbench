"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"

import {
  BUYERS_CALENDAR_MONTH_PRESETS,
  type BuyersCalendarMonthsPreset,
} from "@/lib/buyers-pipeline-calendar-filter"

const PRESET_LABEL: Record<BuyersCalendarMonthsPreset, string> = {
  all: "All time",
  "1": "1 month",
  "3": "3 months",
  "6": "6 months",
  "12": "12 months",
}

type Props = {
  value: BuyersCalendarMonthsPreset
  onChange: (next: BuyersCalendarMonthsPreset) => void
  testId?: string
  ariaLabel?: string
}

export function BuyersPipelineMonthSelect({
  value,
  onChange,
  testId = "pipeline-buyers-months-filter",
  ariaLabel = "Filter buyers by created date (calendar months)",
}: Props) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as BuyersCalendarMonthsPreset)}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-42 shrink-0"
        data-testid={testId}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder="Time period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" data-testid={`${testId}-option--all`}>
          {PRESET_LABEL.all}
        </SelectItem>
        {BUYERS_CALENDAR_MONTH_PRESETS.map((preset) => (
          <SelectItem
            key={preset}
            value={preset}
            data-testid={`${testId}-option--${preset}`}
          >
            {PRESET_LABEL[preset]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
