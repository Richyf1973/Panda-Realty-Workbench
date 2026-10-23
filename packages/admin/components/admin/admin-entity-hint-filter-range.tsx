"use client"

import * as React from "react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"

import { toIsoLocalDate } from "../../admin-entity-list-date-local"

type HintFilterRangeProps = {
  currentValue: string
  groupLabel: string
  queryParam: string
  isDateRange: boolean
  groupLabelId: string
  onHintFilterChange?: (queryParam: string, value: string) => void
}

function parseRange(v: string): [string, string] {
  const [a = "", b = ""] = v.split("|")
  return [a, b]
}

/** `from` = today − 6 calendar months, `to` = today. */
function lastSixMonthsRange(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today)
  from.setMonth(from.getMonth() - 6)
  return { from: toIsoLocalDate(from), to: toIsoLocalDate(today) }
}

export function HintFilterRange({
  currentValue,
  groupLabel,
  queryParam,
  isDateRange,
  groupLabelId,
  onHintFilterChange,
}: HintFilterRangeProps) {
  const [minVal, setMinVal] = React.useState(() => parseRange(currentValue)[0])
  const [maxVal, setMaxVal] = React.useState(() => parseRange(currentValue)[1])

  React.useEffect(() => {
    const [a, b] = parseRange(currentValue)
    setMinVal(a)
    setMaxVal(b)
  }, [currentValue])

  const handleBlur = () => {
    const encoded = minVal || maxVal ? `${minVal}|${maxVal}` : ""
    onHintFilterChange?.(queryParam, encoded)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBlur()
  }

  if (isDateRange) {
    const applyLastSixMonths = () => {
      const { from, to } = lastSixMonthsRange()
      setMinVal(from)
      setMaxVal(to)
      onHintFilterChange?.(queryParam, `${from}|${to}`)
    }

    return (
      <div className="flex flex-col gap-1.5" role="group" aria-labelledby={groupLabelId}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-full text-xs font-normal"
          data-testid={`admin-entity-list-date-range-quickset--${queryParam}--last6months`}
          onClick={applyLastSixMonths}
        >
          6 month look back
        </Button>
        <Input
          type="date"
          value={minVal}
          onChange={(e) => setMinVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          aria-label={`${groupLabel} from`}
        />
        <Input
          type="date"
          value={maxVal}
          onChange={(e) => setMaxVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          aria-label={`${groupLabel} to`}
        />
      </div>
    )
  }

  return (
    <div className="flex gap-2" role="group" aria-labelledby={groupLabelId}>
      <Input
        type="number"
        placeholder="Min"
        value={minVal}
        min={0}
        onChange={(e) => setMinVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
        aria-label={`${groupLabel} minimum`}
      />
      <Input
        type="number"
        placeholder="Max"
        value={maxVal}
        min={0}
        onChange={(e) => setMaxVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
        aria-label={`${groupLabel} maximum`}
      />
    </div>
  )
}
