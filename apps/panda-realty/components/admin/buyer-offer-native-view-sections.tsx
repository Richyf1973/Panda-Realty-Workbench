"use client"

import { Label } from "@repo/ui/label"

import type { PrefillData } from "@/components/offer-form/offer-form-types"

import {
  NativeField,
  NativeSectionHeading,
} from "./buyer-offer-native-view-helpers"

export type SetDraftField = (path: string, value: unknown) => void

export function NativeSection1({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  return (
    <div className="space-y-3">
      <NativeSectionHeading n={1} title="Property & Buyer Details" />
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Property Address</Label>
        <div
          className="min-h-[36px] rounded-lg border border-input bg-input/50 px-2.5 py-1 text-sm text-muted-foreground"
          data-testid="buyer-offer-native--property-address"
        >
          {prefill.propertyAddress ?? ""}
        </div>
      </div>
      {prefill.buyers.map((buyer, i) => (
        <div key={i} className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
          <p className="text-xs font-medium text-muted-foreground">Purchaser {i + 1}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NativeField
              label="Full Legal Entity Name"
              testId={`buyer-offer-native--buyer-${i + 1}-name`}
              value={buyer.name}
              editable={editable}
              onChange={editable ? (v) => setDraftField!(`buyers.${i}.name`, v) : undefined}
            />
            <NativeField
              label="Phone Number"
              testId={`buyer-offer-native--buyer-${i + 1}-phone`}
              value={buyer.phone}
              editable={editable}
              onChange={editable ? (v) => setDraftField!(`buyers.${i}.phone`, v) : undefined}
            />
            <NativeField
              label="Email Address"
              testId={`buyer-offer-native--buyer-${i + 1}-email`}
              value={buyer.email}
              editable={editable}
              onChange={editable ? (v) => setDraftField!(`buyers.${i}.email`, v) : undefined}
            />
            <NativeField
              label="Current Residential Address"
              testId={`buyer-offer-native--buyer-${i + 1}-address`}
              value={buyer.address}
              editable={editable}
              onChange={editable ? (v) => setDraftField!(`buyers.${i}.address`, v) : undefined}
            />
          </div>
        </div>
      ))}
      {prefill.rep && (
        <div
          data-testid="buyer-offer-native--rep-section"
          className="space-y-2 rounded-md border border-border bg-muted/10 p-3"
        >
          <p className="text-xs font-medium text-muted-foreground">Representative</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <NativeField
              label="Name"
              testId="buyer-offer-native--rep-name"
              value={prefill.rep.name}
              editable={editable}
              onChange={editable ? (v) => setDraftField!("rep.name", v) : undefined}
            />
            <NativeField
              label="Phone"
              testId="buyer-offer-native--rep-phone"
              value={prefill.rep.phone}
              editable={editable}
              onChange={editable ? (v) => setDraftField!("rep.phone", v) : undefined}
            />
            <NativeField
              label="Email"
              testId="buyer-offer-native--rep-email"
              value={prefill.rep.email}
              editable={editable}
              onChange={editable ? (v) => setDraftField!("rep.email", v) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function NativeSection2({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  return (
    <div className="space-y-3">
      <NativeSectionHeading n={2} title="Solicitor Details" />
      <p className="text-xs font-medium text-muted-foreground">Buyer's Solicitor</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NativeField
          label="Solicitor's Name"
          testId="buyer-offer-native--solicitor-name"
          value={prefill.solicitorName ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("solicitorName", v) : undefined}
        />
        <NativeField
          label="Solicitor's Phone"
          testId="buyer-offer-native--solicitor-phone"
          value={prefill.solicitorPhone ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("solicitorPhone", v) : undefined}
        />
        <NativeField
          label="Solicitor's Legal Practice Address"
          testId="buyer-offer-native--solicitor-address"
          value={prefill.solicitorAddress ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("solicitorAddress", v) : undefined}
        />
        <NativeField
          label="Solicitor's Email"
          testId="buyer-offer-native--solicitor-email"
          value={prefill.solicitorEmail ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("solicitorEmail", v) : undefined}
        />
      </div>
      <p className="text-xs font-medium text-muted-foreground">Seller's Solicitor</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NativeField
          label="Solicitor's Name"
          testId="buyer-offer-native--seller-solicitor-name"
          value={prefill.sellerSolicitorName ?? ""}
        />
        <NativeField
          label="Solicitor's Phone"
          testId="buyer-offer-native--seller-solicitor-phone"
          value={prefill.sellerSolicitorPhone ?? ""}
        />
        <NativeField
          label="Solicitor's Legal Practice Address"
          testId="buyer-offer-native--seller-solicitor-address"
          value={prefill.sellerSolicitorAddress ?? ""}
        />
        <NativeField
          label="Solicitor's Email"
          testId="buyer-offer-native--seller-solicitor-email"
          value={prefill.sellerSolicitorEmail ?? ""}
        />
      </div>
    </div>
  )
}

export function NativeSection3({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  const totalDeposit =
    prefill.depositInitial && prefill.depositBalance
      ? String(Number(prefill.depositInitial) + Number(prefill.depositBalance))
      : ""
  return (
    <div className="space-y-3">
      <NativeSectionHeading n={3} title="Financial Offer Structuring" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NativeField
          label="Proposed Offer Amount ($)"
          testId="buyer-offer-native--offer-amount"
          value={prefill.offerAmount ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("offerAmount", v) : undefined}
        />
        <NativeField
          label="Total Deposit Amount ($)"
          testId="buyer-offer-native--total-deposit"
          value={totalDeposit}
        />
        <NativeField
          label="Initial Holding Payment ($)"
          testId="buyer-offer-native--initial-payment"
          value={prefill.depositInitial ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("depositInitial", v) : undefined}
        />
        <NativeField
          label="Secondary Payment / Balance ($)"
          testId="buyer-offer-native--second-payment"
          value={prefill.depositBalance ?? ""}
          editable={editable}
          onChange={editable ? (v) => setDraftField!("depositBalance", v) : undefined}
        />
      </div>
    </div>
  )
}
