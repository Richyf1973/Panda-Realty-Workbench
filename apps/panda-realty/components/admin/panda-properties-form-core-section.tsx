"use client"

import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@repo/ui/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/collapsible"

import { FieldCombobox } from "./panda-properties-field-combobox"
import { FieldCurrency, FieldDateText, FieldText } from "./panda-properties-form-fields"
import type { FormLike } from "./panda-properties-dialog-form-types"

/**
 * Form `name` / column keys rendered inside Property details — keep in sync with `FieldText` /
 * `FieldCurrency` / `FieldDateText` in this file; used to open the section after payload validation.
 */
export const PANDA_PROPERTIES_CORE_SECTION_PAYLOAD_KEY_LIST = [
  "streetAddress",
  "suburb",
  "state",
  "postcode",
  "advertisementId",
  "propertyType",
  "bed",
  "bath",
  "car",
  "landSize",
  "buildingArea",
  "zoning",
  "developmentZone",
  "landUse1",
  "rpd",
  "salePrice",
  "saleDate",
] as const

export const PANDA_PROPERTIES_CORE_SECTION_PAYLOAD_KEYS: ReadonlySet<string> = new Set(
  PANDA_PROPERTIES_CORE_SECTION_PAYLOAD_KEY_LIST,
)

export function PandaPropertiesFormCoreSection({
  form,
  propertyDetailsOpen,
  onPropertyDetailsOpenChange,
}: {
  form: FormLike
  /** When set, Property details open state is controlled by the parent (e.g. after payload validation). */
  propertyDetailsOpen?: boolean
  onPropertyDetailsOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const controlled = propertyDetailsOpen !== undefined
  const open = controlled ? propertyDetailsOpen : uncontrolledOpen
  const setOpen = controlled
    ? (v: boolean) => onPropertyDetailsOpenChange?.(v)
    : setUncontrolledOpen

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="shrink-0 border-b"
      data-testid="panda-properties-form-section--core"
    >
      <CollapsibleTrigger
        className="group flex w-full items-center justify-between px-4 py-2 text-left"
        data-testid="panda-properties-form-section--core-trigger"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Property details
        </p>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            "group-data-[state=open]:rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-12">
          <FieldText
            form={form}
            name="streetAddress"
            label="Street Address"
            required
            className="min-w-0 sm:col-span-2 lg:col-span-5"
          />
          <FieldText
            form={form}
            name="suburb"
            label="Suburb"
            required
            className="min-w-0 lg:col-span-3"
          />
          <FieldText
            form={form}
            name="state"
            label="State"
            required
            className="min-w-0 lg:col-span-2"
          />
          <FieldText
            form={form}
            name="postcode"
            label="Postcode"
            required
            className="min-w-0 lg:col-span-2"
          />

          <FieldText
            form={form}
            name="advertisementId"
            label="Advertisement ID"
            className="min-w-0 lg:col-span-2"
          />
          <FieldCombobox
            form={form}
            name="propertyType"
            label="Property Type"
            required
            className="min-w-0 lg:col-span-3"
            optionsFetchPath="/api/admin/property-types/options"
          />
          <div
            className="grid min-w-0 grid-cols-3 gap-2 sm:col-span-2 lg:col-span-3"
            data-testid="panda-properties-form-field-group--bed-bath-car"
          >
            <FieldText
              form={form}
              name="bed"
              label="Bed"
              inputClassName="text-right tabular-nums"
              className="min-w-0"
              inputMode="numeric"
              maxLength={2}
            />
            <FieldText
              form={form}
              name="bath"
              label="Bath"
              inputClassName="text-right tabular-nums"
              className="min-w-0"
              inputMode="numeric"
              maxLength={2}
            />
            <FieldText
              form={form}
              name="car"
              label="Car"
              inputClassName="text-right tabular-nums"
              className="min-w-0"
              inputMode="numeric"
              maxLength={2}
            />
          </div>
          <FieldText
            form={form}
            name="landSize"
            label="Land Size"
            inputClassName="text-right"
            className="min-w-0 lg:col-span-2"
          />
          <FieldText
            form={form}
            name="buildingArea"
            label="Building Area (m²)"
            inputClassName="text-right"
            className="min-w-0 lg:col-span-2"
          />
          <FieldText
            form={form}
            name="zoning"
            label="Zoning"
            className="min-w-0 lg:col-span-3"
          />
          <FieldText
            form={form}
            name="developmentZone"
            label="Development Zone"
            className="min-w-0 lg:col-span-3"
          />
          <FieldText
            form={form}
            name="landUse1"
            label="Land Use 1"
            className="min-w-0 lg:col-span-3"
          />
          <FieldText
            form={form}
            name="rpd"
            label="RPD"
            className="min-w-0 lg:col-span-3"
          />
          <FieldCurrency
            form={form}
            name="salePrice"
            label="Last sale price"
            prefix="$"
            className="min-w-0 lg:col-span-3"
          />
          <FieldDateText
            form={form}
            name="saleDate"
            label="Last sale date"
            className="min-w-0 lg:col-span-3"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
