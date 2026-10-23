"use client"

import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"

export function NativeSectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {n}. {title}
    </p>
  )
}

export function NativeField({
  label,
  testId,
  value,
  type = "text",
  editable = false,
  onChange,
}: {
  label: string
  testId: string
  value: string
  type?: string
  editable?: boolean
  onChange?: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={!editable}
        data-testid={testId}
        onChange={editable && onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </div>
  )
}

export interface RadioOption {
  value: string
  label: string
}

export function NativeRadioGroup({
  name,
  options,
  selected,
  testId,
  editable = false,
  onSelect,
}: {
  name: string
  options: RadioOption[]
  selected: string | undefined
  testId: string
  editable?: boolean
  onSelect?: (v: string) => void
}) {
  return (
    <div data-testid={testId} className="flex gap-4">
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={selected === opt.value}
            disabled={!editable}
            onChange={editable && onSelect ? () => onSelect(opt.value) : () => {}}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export function Divider() {
  return <div className="border-t border-border" />
}

export const SALE_STATUS_OPTIONS = [
  { value: "to_be_listed", label: "To be Listed" },
  { value: "on_the_market", label: "On the Market / Live Campaign" },
  { value: "under_contract_conditional", label: "Under Contract (Conditional)" },
  { value: "under_contract_unconditional", label: "Under Contract (Unconditional)" },
] as const

export const UNDER_CONTRACT_CONDITIONS = [
  { value: "finance", label: "Subject to Finance Approval", testId: "buyer-offer-native--sale-condition-finance" },
  { value: "building_pest", label: "Building & Pest Assessment", testId: "buyer-offer-native--sale-condition-building-pest" },
  { value: "sale_of_property", label: "Prior Interdependent Property Sale", testId: "buyer-offer-native--sale-condition-sale-of-property" },
  { value: "other", label: "Other Unique Conditions", testId: "buyer-offer-native--sale-condition-other" },
] as const
