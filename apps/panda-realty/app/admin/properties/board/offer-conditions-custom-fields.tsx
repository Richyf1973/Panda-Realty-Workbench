"use client"

import type { Dispatch, SetStateAction } from "react"
import { CalendarIcon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Calendar } from "@repo/ui/calendar"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

export type CustomConditionRow = { label: string; days: string }

export function CustomConditionFields({
  buyerOfferId,
  contractDateDraft,
  openCalendar,
  setOpenCalendar,
  rows,
  setRows,
}: {
  buyerOfferId: number
  contractDateDraft: Date | null
  openCalendar: string | null
  setOpenCalendar: Dispatch<SetStateAction<string | null>>
  rows: CustomConditionRow[]
  setRows: Dispatch<SetStateAction<CustomConditionRow[]>>
}) {
  function addRow() {
    setRows((prev) => [...prev, { label: "", days: "" }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLabel(index: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, label: value } : r)))
  }

  function updateDays(index: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, days: value } : r)))
  }

  const calendarKey = (index: number) => `custom-${index}-${buyerOfferId}`

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Other conditions</Label>
      {rows.map((row, index) => {
        const key = calendarKey(index)
        return (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="text"
              value={row.label}
              onChange={(e) => updateLabel(index, e.target.value)}
              placeholder="Condition name…"
              className="h-8 text-sm flex-1"
              data-testid={`offer-conditions-custom-label--${index}--${buyerOfferId}`}
            />
            <Input
              type="number"
              min={0}
              value={row.days}
              onChange={(e) => updateDays(index, e.target.value)}
              placeholder="days"
              className="h-8 text-sm w-20 shrink-0"
              data-testid={`offer-conditions-custom-days--${index}--${buyerOfferId}`}
            />
            {contractDateDraft ? (
              <Popover
                open={openCalendar === key}
                onOpenChange={(open) => setOpenCalendar(open ? key : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    data-testid={`offer-conditions-custom-calendar-btn--${index}--${buyerOfferId}`}
                  >
                    <CalendarIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      row.days
                        ? new Date(contractDateDraft.getTime() + parseInt(row.days, 10) * 86400000)
                        : undefined
                    }
                    onSelect={(d) => {
                      if (d) {
                        const days = Math.round((d.getTime() - contractDateDraft.getTime()) / 86400000)
                        updateDays(index, Math.max(0, days).toString())
                      }
                      setOpenCalendar(null)
                    }}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled
                      data-testid={`offer-conditions-custom-calendar-btn--${index}--${buyerOfferId}`}
                    >
                      <CalendarIcon className="size-3.5" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Contract date required</TooltipContent>
              </Tooltip>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(index)}
              data-testid={`offer-conditions-custom-remove--${index}--${buyerOfferId}`}
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        )
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        onClick={addRow}
        data-testid={`offer-conditions-custom-add--${buyerOfferId}`}
      >
        <PlusIcon className="size-3" />
        Add condition
      </Button>
    </div>
  )
}
