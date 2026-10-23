"use client"

import { OfferFormFooter, OfferFormHeader } from "./offer-form-shared"

export function OfferFormSuccess() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl" data-testid="offer-form-success">
      <OfferFormHeader />
      <div className="px-8 py-14 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-stone-800">Thank you!</h1>
        <p className="text-stone-500">Your offer has been submitted. The agent will be in touch with you shortly.</p>
      </div>
      <OfferFormFooter />
    </div>
  )
}
