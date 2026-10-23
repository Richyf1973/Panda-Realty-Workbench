"use client"

import { FormField, inputClass } from "./offer-form-shared"
import type { BuyerCard } from "./offer-form-types"

interface OfferFormBuyerCardsProps {
  buyers: BuyerCard[]
  setBuyers: (v: BuyerCard[]) => void
}

function updateBuyer(buyers: BuyerCard[], index: number, patch: Partial<BuyerCard>): BuyerCard[] {
  return buyers.map((b, i) => (i === index ? { ...b, ...patch } : b))
}

export function OfferFormBuyerCards({ buyers, setBuyers }: OfferFormBuyerCardsProps) {
  function addBuyer() {
    setBuyers([...buyers, {
      id: crypto.randomUUID(),
      name: "", phone: "", email: "", address: buyers[0]?.address ?? "",
      hasRep: false, repName: "", repPhone: "", repEmail: "", repIsPreferredContact: "yes",
    }])
  }

  function removeBuyer(index: number) {
    setBuyers(buyers.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {buyers.map((buyer, i) => {
        const n = i + 1
        return (
          <div
            key={buyer.id}
            className="relative space-y-4 rounded-xl border border-slate-200/80 bg-slate-50 p-5 shadow-sm transition-all duration-150"
            data-testid={`offer-form-buyer-card-${n}`}
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Purchaser {n}
              </h3>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => removeBuyer(i)}
                  className="text-xs font-bold text-red-500 transition hover:text-red-700"
                  data-testid={`offer-form-remove-buyer-${n}`}
                >
                  Remove Entity
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label={<>Full Legal Entity Name <span className="text-red-500">*</span></>}>
                <input
                  type="text"
                  value={buyer.name}
                  onChange={(e) => setBuyers(updateBuyer(buyers, i, { name: e.target.value }))}
                  className={inputClass()}
                  data-testid={`offer-form-buyer-${n}-name`}
                />
              </FormField>
              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={buyer.phone}
                  onChange={(e) => setBuyers(updateBuyer(buyers, i, { phone: e.target.value }))}
                  className={inputClass()}
                  data-testid={`offer-form-buyer-${n}-phone`}
                />
              </FormField>
              <FormField label="Email Address">
                <input
                  type="email"
                  value={buyer.email}
                  onChange={(e) => setBuyers(updateBuyer(buyers, i, { email: e.target.value }))}
                  className={inputClass()}
                  data-testid={`offer-form-buyer-${n}-email`}
                />
              </FormField>
              <FormField label={<>Current Residential Address <span className="text-red-500">*</span></>}>
                <input
                  type="text"
                  value={buyer.address}
                  onChange={(e) =>
                    i === 0
                      ? setBuyers(buyers.map((b) => ({ ...b, address: e.target.value })))
                      : setBuyers(updateBuyer(buyers, i, { address: e.target.value }))
                  }
                  className={inputClass()}
                  data-testid={`offer-form-buyer-${n}-address`}
                />
              </FormField>
            </div>
            <div className="border-t border-slate-200/60 pt-3">
              <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={buyer.hasRep}
                  onChange={(e) => setBuyers(updateBuyer(buyers, i, { hasRep: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  data-testid={`offer-form-buyer-${n}-has-rep`}
                />
                Is this purchaser represented by a third-party alternate entity? (e.g. POA, Executive Buyer Agent)
              </label>
              {buyer.hasRep && (
                <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-inner transition-all duration-200" data-testid={`offer-form-buyer-${n}-rep-section`}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField label="Representative Legal Name">
                      <input
                        type="text"
                        value={buyer.repName}
                        onChange={(e) => setBuyers(updateBuyer(buyers, i, { repName: e.target.value }))}
                        className={inputClass()}
                        data-testid={`offer-form-buyer-${n}-rep-name`}
                      />
                    </FormField>
                    <FormField label="Representative Phone">
                      <input
                        type="tel"
                        value={buyer.repPhone}
                        onChange={(e) => setBuyers(updateBuyer(buyers, i, { repPhone: e.target.value }))}
                        className={inputClass()}
                        data-testid={`offer-form-buyer-${n}-rep-phone`}
                      />
                    </FormField>
                    <FormField label="Representative Email">
                      <input
                        type="email"
                        value={buyer.repEmail}
                        onChange={(e) => setBuyers(updateBuyer(buyers, i, { repEmail: e.target.value }))}
                        className={inputClass()}
                        data-testid={`offer-form-buyer-${n}-rep-email`}
                      />
                    </FormField>
                  </div>
                  <div>
                    <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Is this third-party entity the preferred administrative primary communication vector?
                    </p>
                    <div className="flex gap-6">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name={`rep-is-preferred-${n}`}
                          value="yes"
                          checked={buyer.repIsPreferredContact === "yes"}
                          onChange={() => setBuyers(updateBuyer(buyers, i, { repIsPreferredContact: "yes" }))}
                          className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          data-testid={`offer-form-buyer-${n}-rep-is-preferred-yes`}
                        />
                        Yes, default communications
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="radio"
                          name={`rep-is-preferred-${n}`}
                          value="no"
                          checked={buyer.repIsPreferredContact === "no"}
                          onChange={() => setBuyers(updateBuyer(buyers, i, { repIsPreferredContact: "no" }))}
                          className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          data-testid={`offer-form-buyer-${n}-rep-is-preferred-no`}
                        />
                        No, secondary record only
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div className="text-right">
        <button
          type="button"
          onClick={addBuyer}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-[0.98]"
          data-testid="offer-form-add-buyer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Purchaser
        </button>
      </div>
    </div>
  )
}
