"use client"

import { Loader2 } from "lucide-react"

import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"

import { PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE, hasPrefillFillStep } from "@/lib/admin/constants"
import type { AgentRow } from "@/lib/admin/types"
import { Form6FillStep } from "./form6-fill-step"
import { ContractSpFillStep } from "./contract-sp-fill-step"

function PrefillField({
  label,
  testId,
  value,
  onChange,
  className,
}: {
  label: string
  testId: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
        data-testid={testId}
      />
    </div>
  )
}

export function PropertyFormPrefillStep({
  prefillValues,
  setPrefill,
  onValuesChange,
  loadingPrefill,
  prefillStrategy,
  agents,
  selectedAgentId,
  onAgentChange,
}: {
  prefillValues: Record<string, string>
  setPrefill: (key: string) => (value: string) => void
  onValuesChange: (values: Record<string, string>) => void
  loadingPrefill: boolean
  prefillStrategy: string | null
  agents: AgentRow[]
  selectedAgentId: number | null
  onAgentChange: (id: number) => void
}) {
  if (hasPrefillFillStep(prefillStrategy)) {
    if (loadingPrefill) {
      return (
        <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pre-fill data…
        </div>
      )
    }
    if (prefillStrategy === PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE) {
      return (
        <ContractSpFillStep
          prefillValues={prefillValues}
          agents={agents}
          selectedAgentId={selectedAgentId}
          onAgentChange={onAgentChange}
          onValuesChange={onValuesChange}
        />
      )
    }
    return (
      <Form6FillStep
        prefillValues={prefillValues}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentChange={onAgentChange}
        onValuesChange={onValuesChange}
      />
    )
  }

  // pro-forma-2026 or null — original layout unchanged
  return (
    <div className="flex flex-col gap-3" data-testid="property-form-prefill-step">
      <p className="text-sm font-medium">Step 1 of 2 — Pre-fill buyer details</p>

      {loadingPrefill ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pre-fill data…
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Buyer Information
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <PrefillField label="Buyer 1 name" testId="property-form-prefill-buyer1-name" value={prefillValues.buyer1Name ?? ""} onChange={setPrefill("buyer1Name")} />
              <PrefillField label="Buyer 2 name" testId="property-form-prefill-buyer2-name" value={prefillValues.buyer2Name ?? ""} onChange={setPrefill("buyer2Name")} />
              <PrefillField label="Address" testId="property-form-prefill-buyer-address" value={prefillValues.buyerAddress ?? ""} onChange={setPrefill("buyerAddress")} className="col-span-2" />
              <PrefillField label="Phone" testId="property-form-prefill-buyer-phone" value={prefillValues.buyerPhone ?? ""} onChange={setPrefill("buyerPhone")} />
              <PrefillField label="Email" testId="property-form-prefill-buyer-email" value={prefillValues.buyerEmail ?? ""} onChange={setPrefill("buyerEmail")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Solicitor (optional)
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <PrefillField label="Name" testId="property-form-prefill-solicitor-name" value={prefillValues.solicitorName ?? ""} onChange={setPrefill("solicitorName")} className="col-span-2" />
              <PrefillField label="Address" testId="property-form-prefill-solicitor-address" value={prefillValues.solicitorAddress ?? ""} onChange={setPrefill("solicitorAddress")} className="col-span-2" />
              <PrefillField label="Phone" testId="property-form-prefill-solicitor-phone" value={prefillValues.solicitorPhone ?? ""} onChange={setPrefill("solicitorPhone")} />
              <PrefillField label="Email" testId="property-form-prefill-solicitor-email" value={prefillValues.solicitorEmail ?? ""} onChange={setPrefill("solicitorEmail")} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Property Address
            </p>
            <p
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              data-testid="property-form-prefill-property-address"
            >
              {prefillValues.propertyAddress || "—"}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
