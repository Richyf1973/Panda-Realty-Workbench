"use client"

import { Textarea } from "@repo/ui/textarea"

import type { PrefillData } from "@/components/offer-form/offer-form-types"

import { NativeSectionHeading } from "./buyer-offer-native-view-helpers"
import type { SetDraftField } from "./buyer-offer-native-view-sections"

export function NativeSectionMultiOffer({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  return (
    <div className="space-y-3">
      <NativeSectionHeading n={5} title="Multi-Offer Scenario Acknowledgment" />
      <div className="space-y-2">
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={prefill.multiOfferCheckHighest ?? false}
            disabled={!editable}
            data-testid="buyer-offer-native--multi-offer-highest"
            onChange={
              editable
                ? (e) => setDraftField!("multiOfferCheckHighest", e.target.checked)
                : () => {}
            }
          />
          <span>I/We confirm this purchase structure represents our highest and best offer and the terms herein are presented in good faith.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={prefill.multiOfferCheckDiscretion ?? false}
            disabled={!editable}
            data-testid="buyer-offer-native--multi-offer-discretion"
            onChange={
              editable
                ? (e) => setDraftField!("multiOfferCheckDiscretion", e.target.checked)
                : () => {}
            }
          />
          <span>I/We understand that the vendor reserves the right to accept any offer outright, counter any offer, or decline all offers at their absolute discretion.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={prefill.multiOfferCheckConfidential ?? false}
            disabled={!editable}
            data-testid="buyer-offer-native--multi-offer-confidential"
            onChange={
              editable
                ? (e) => setDraftField!("multiOfferCheckConfidential", e.target.checked)
                : () => {}
            }
          />
          <span>I/We acknowledge that all alternate competing offers remain strictly confidential and will not be disclosed to any party.</span>
        </label>
      </div>
    </div>
  )
}

export function NativeSection6({
  prefill,
  setDraftField,
}: {
  prefill: PrefillData
  setDraftField?: SetDraftField
}) {
  const editable = !!setDraftField
  const notes = prefill.conditionNotes ?? ""
  if (!editable && !notes) return null
  return (
    <div className="space-y-2">
      <NativeSectionHeading n={6} title="Special Conditions / Extra Comments" />
      <Textarea
        value={notes}
        disabled={!editable}
        rows={4}
        data-testid="buyer-offer-native--extra-comments"
        onChange={
          editable
            ? (e) => setDraftField!("conditionNotes", e.target.value)
            : undefined
        }
      />
    </div>
  )
}
