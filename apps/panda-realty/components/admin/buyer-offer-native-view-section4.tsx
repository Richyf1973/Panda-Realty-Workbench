"use client"

import { Label } from "@repo/ui/label"

import type { PrefillData } from "@/components/offer-form/offer-form-types"

import {
  NativeField,
  NativeRadioGroup,
  NativeSectionHeading,
} from "./buyer-offer-native-view-helpers"
import {
  NativeBuildingPestPanel,
  NativeFinancePanel,
  NativeSalePanel,
} from "./buyer-offer-native-view-section4-panels"
import type { SetDraftField } from "./buyer-offer-native-view-sections"

export function NativeSection4({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  const isExplicitlyNotCashOffer = prefill.isCashOffer === false
  const hasSettlement = !!(prefill.settlementPeriod || prefill.settlementDate)
  return (
    <div className="space-y-4">
      <NativeSectionHeading n={4} title="Offer Contingencies & Terms" />
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Statutory cooling off period — do you wish to waive it?
        </Label>
        <NativeRadioGroup
          name="native-waive-cooling-off"
          options={[
            { value: "yes", label: "Yes, Waive Period" },
            { value: "no", label: "No, Retain Statutory Period" },
          ]}
          selected={
            prefill.waiveCoolingOff === true
              ? "yes"
              : prefill.waiveCoolingOff === false
                ? "no"
                : undefined
          }
          testId="buyer-offer-native--cooling-off"
          editable={editable}
          onSelect={
            editable
              ? (v) => setDraftField!("waiveCoolingOff", v === "yes")
              : undefined
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Are you a Cash Buyer?</Label>
        <NativeRadioGroup
          name="native-cash-buyer"
          options={[
            { value: "yes", label: "Yes (Unconditional on Finance)" },
            { value: "no", label: "No (Subject to Finance / Terms)" },
          ]}
          selected={
            prefill.isCashOffer === true
              ? "yes"
              : prefill.isCashOffer === false
                ? "no"
                : undefined
          }
          testId="buyer-offer-native--cash-buyer"
          editable={editable}
          onSelect={
            editable
              ? (v) => setDraftField!("isCashOffer", v === "yes")
              : undefined
          }
        />
      </div>
      {isExplicitlyNotCashOffer && (
        <NativeFinancePanel prefill={prefill} setDraftField={setDraftField} />
      )}
      <NativeBuildingPestPanel prefill={prefill} setDraftField={setDraftField} />
      {isExplicitlyNotCashOffer && (
        <NativeSalePanel prefill={prefill} setDraftField={setDraftField} />
      )}
      {(editable || hasSettlement) && (
        <div
          data-testid="buyer-offer-native--settlement-block"
          className="space-y-2 rounded-md border border-border p-3"
        >
          <Label className="text-xs text-muted-foreground">
            Proposed Settlement Date / Interval
          </Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NativeField
              label="Settlement Period (days)"
              testId="buyer-offer-native--settlement-period"
              value={prefill.settlementPeriod ?? ""}
              editable={editable}
              onChange={
                editable ? (v) => setDraftField!("settlementPeriod", v) : undefined
              }
            />
            <NativeField
              label="Settlement Date"
              testId="buyer-offer-native--settlement-date"
              value={prefill.settlementDate ?? ""}
              type="text"
              editable={editable}
              onChange={
                editable ? (v) => setDraftField!("settlementDate", v) : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
