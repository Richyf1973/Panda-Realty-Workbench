"use client"

import type { Dispatch, SetStateAction } from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Calendar } from "@repo/ui/calendar"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

export type OfferConditionDayFieldId =
  | "cooling-off"
  | "finance"
  | "building-pest"
  | "due-diligence"
  | "subject-to-sale"
  | "sale-of-property"
  | "unconditional-contract"

export type OfferConditionDayFieldRow = {
  id: OfferConditionDayFieldId
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  disabled?: boolean
  note?: string
}

export function OfferConditionsDayCountFields({
  buyerOfferId,
  contractDateDraft,
  openCalendar,
  setOpenCalendar,
  fields,
}: {
  buyerOfferId: number
  contractDateDraft: Date | null
  openCalendar: string | null
  setOpenCalendar: Dispatch<SetStateAction<string | null>>
  fields: OfferConditionDayFieldRow[]
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {fields.map(({ id, label, value, onChange, placeholder, disabled, note }) => (
        <div key={id} className="space-y-1">
          <Label htmlFor={`${id}-${buyerOfferId}`} className="text-xs text-muted-foreground">
            {label}
          </Label>
          <div className="flex gap-1">
            <Input
              id={`${id}-${buyerOfferId}`}
              data-testid={`offer-conditions-days-input--${id}--${buyerOfferId}`}
              type="number"
              min={0}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-8 text-sm flex-1"
            />
            {contractDateDraft ? (
              <Popover
                open={openCalendar === id}
                onOpenChange={(open) => setOpenCalendar(open ? id : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={disabled}
                    data-testid={`offer-conditions-calendar-btn--${id}--${buyerOfferId}`}
                  >
                    <CalendarIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      value && Number.isFinite(parseInt(value, 10))
                        ? new Date(contractDateDraft.getTime() + parseInt(value, 10) * 86400000)
                        : undefined
                    }
                    onSelect={(d) => {
                      if (d) {
                        const nd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
                        const days = Math.round((nd.getTime() - contractDateDraft.getTime()) / 86400000)
                        onChange(Math.max(0, days).toString())
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
                      data-testid={`offer-conditions-calendar-btn--${id}--${buyerOfferId}`}
                    >
                      <CalendarIcon className="size-3.5" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Contract date required</TooltipContent>
              </Tooltip>
            )}
          </div>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
      ))}
    </div>
  )
}
