"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Calendar } from "@repo/ui/calendar"
import { Label } from "@repo/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"

import { formatDate } from "./panel-shared"

export function OfferConditionsContractDateField({
  buyerOfferId,
  value,
  onChange,
}: {
  buyerOfferId: number
  value: Date | null
  onChange: (next: Date | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1 space-y-1">
        <Label className="text-xs text-muted-foreground">Contract date</Label>
        <div className="flex min-w-0 gap-1">
          <div className="flex-1 min-w-0">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-full justify-start text-left text-sm font-normal"
                data-testid={`offer-conditions-contract-date-btn--${buyerOfferId}`}
              >
                <CalendarIcon className="mr-2 size-3.5 shrink-0 opacity-70" />
                {value ? formatDate(value) : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ?? undefined}
                onSelect={(d) => {
                  onChange(d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : null)
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs text-muted-foreground"
            data-testid={`offer-conditions-contract-date-clear--${buyerOfferId}`}
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
