"use client"

import { SectionHeading } from "./offer-form-shared"

interface OfferFormSection5MultiOfferProps {
  multiOfferCheckHighest: boolean
  setMultiOfferCheckHighest: (v: boolean) => void
  multiOfferCheckDiscretion: boolean
  setMultiOfferCheckDiscretion: (v: boolean) => void
  multiOfferCheckConfidential: boolean
  setMultiOfferCheckConfidential: (v: boolean) => void
  errors?: {
    multiOfferCheckHighest?: string
    multiOfferCheckDiscretion?: string
    multiOfferCheckConfidential?: string
  }
  viewMode?: boolean
}

export function OfferFormSection5MultiOffer({
  multiOfferCheckHighest, setMultiOfferCheckHighest,
  multiOfferCheckDiscretion, setMultiOfferCheckDiscretion,
  multiOfferCheckConfidential, setMultiOfferCheckConfidential,
  errors = {},
  viewMode = false,
}: OfferFormSection5MultiOfferProps) {
  return (
    <div
      className="space-y-4 rounded-xl border border-amber-200/70 bg-amber-50/40 p-5"
      data-testid="offer-form-multi-offer-section"
    >
      <SectionHeading number={5} title="Multi-Offer Scenario Acknowledgment" variant="dark" />
      <div className="space-y-3 text-xs font-medium leading-relaxed text-slate-700">
        <p className="rounded-lg border border-amber-200 bg-amber-100/60 p-3 font-bold leading-relaxed text-amber-900">
          ⚠️ NOTICE TO PURCHASER(S): You are submitting an offer in a competitive multi-offer scenario. Competing buyers are reviewing this asset simultaneously. The seller may accept the most favorable offer without giving any party a second opportunity to negotiate.
        </p>
        <div className="space-y-3 pt-2">
          <label className="flex cursor-pointer select-none items-start group">
            <input
              type="checkbox"
              checked={multiOfferCheckHighest}
              onChange={(e) => setMultiOfferCheckHighest(e.target.checked)}
              disabled={viewMode}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              data-testid="offer-form-multi-offer-highest"
            />
            <span className="ml-2.5 text-sm leading-snug text-slate-700 group-hover:text-slate-900">
              I/We confirm this purchase structure represents our <strong>highest and best offer</strong>, and understand we may not have a subsequent opportunity to revise price or terms.{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.multiOfferCheckHighest && (
            <p className="text-xs text-red-500">{errors.multiOfferCheckHighest}</p>
          )}

          <label className="flex cursor-pointer select-none items-start group">
            <input
              type="checkbox"
              checked={multiOfferCheckDiscretion}
              onChange={(e) => setMultiOfferCheckDiscretion(e.target.checked)}
              disabled={viewMode}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              data-testid="offer-form-multi-offer-discretion"
            />
            <span className="ml-2.5 text-sm leading-snug text-slate-700 group-hover:text-slate-900">
              I/We understand that the vendor reserves the right to accept any offer outright, reject all offers, or select an alternative single offer to negotiate further at their complete discretion.{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.multiOfferCheckDiscretion && (
            <p className="text-xs text-red-500">{errors.multiOfferCheckDiscretion}</p>
          )}

          <label className="flex cursor-pointer select-none items-start group">
            <input
              type="checkbox"
              checked={multiOfferCheckConfidential}
              onChange={(e) => setMultiOfferCheckConfidential(e.target.checked)}
              disabled={viewMode}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              data-testid="offer-form-multi-offer-confidential"
            />
            <span className="ml-2.5 text-sm text-slate-700 group-hover:text-slate-900">
              I/We acknowledge that all alternate competing offers remain strictly confidential, and the Sales Agent cannot disclose details of competing buyers&apos; parameters.{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.multiOfferCheckConfidential && (
            <p className="text-xs text-red-500">{errors.multiOfferCheckConfidential}</p>
          )}
        </div>
      </div>
    </div>
  )
}
