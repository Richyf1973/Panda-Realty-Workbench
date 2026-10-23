"use client"

import { FormField, OfferRadio, inputClass } from "./offer-form-shared"

interface OfferFormFinanceSectionProps {
  subjectToFinance: boolean
  setSubjectToFinance: (v: boolean) => void
  financePreApproved: boolean | null
  setFinancePreApproved: (v: boolean | null) => void
  financeApprovalDays: string
  setFinanceApprovalDays: (v: string) => void
  financeBank: string
  setFinanceBank: (v: string) => void
  financeBankContactName: string
  setFinanceBankContactName: (v: string) => void
  financeBankContactPhone: string
  setFinanceBankContactPhone: (v: string) => void
  financeBankContactEmail: string
  setFinanceBankContactEmail: (v: string) => void
  viewMode?: boolean
}

export function OfferFormFinanceSection({
  subjectToFinance,
  setSubjectToFinance,
  financePreApproved,
  setFinancePreApproved,
  financeApprovalDays,
  setFinanceApprovalDays,
  financeBank,
  setFinanceBank,
  financeBankContactName,
  setFinanceBankContactName,
  financeBankContactPhone,
  setFinanceBankContactPhone,
  financeBankContactEmail,
  setFinanceBankContactEmail,
  viewMode = false,
}: OfferFormFinanceSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-slate-50 p-4 transition-all duration-200">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Is this offer subject to finance approval?
        </label>
        <div className="flex space-x-4">
          <OfferRadio name="subjectToFinance" checked={subjectToFinance} onChange={() => setSubjectToFinance(true)} disabled={viewMode} testId="offer-form-subject-to-finance-yes" className="text-sm text-gray-700">
            Yes
          </OfferRadio>
          <OfferRadio name="subjectToFinance" checked={!subjectToFinance} onChange={() => setSubjectToFinance(false)} disabled={viewMode} testId="offer-form-subject-to-finance-no" className="text-sm text-gray-700">
            No
          </OfferRadio>
        </div>
      </div>

      {subjectToFinance && (
        <div className="space-y-4 border-t border-gray-200 pt-2" data-testid="offer-form-finance-section">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              If subject to finance, are you pre-approved?
            </label>
            <div className="flex space-x-4">
              <OfferRadio name="financePreApproved" checked={financePreApproved === true} onChange={() => setFinancePreApproved(true)} disabled={viewMode} testId="offer-form-finance-preapproved-yes" className="text-sm text-gray-700">
                Yes
              </OfferRadio>
              <OfferRadio name="financePreApproved" checked={financePreApproved === false} onChange={() => setFinancePreApproved(false)} disabled={viewMode} testId="offer-form-finance-preapproved-no" className="text-sm text-gray-700">
                No
              </OfferRadio>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2">
            <FormField label="Days required to get full Bank Approval">
              <select
                value={financeApprovalDays}
                onChange={(e) => setFinanceApprovalDays(e.target.value)}
                disabled={viewMode}
                className={inputClass()}
                data-testid="offer-form-finance-days-select"
              >
                <option value="">-- Select --</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="21">21 Days</option>
              </select>
            </FormField>
            <FormField label="Financier / Banking Institution">
              <input
                type="text"
                value={financeBank}
                onChange={(e) => setFinanceBank(e.target.value)}
                disabled={viewMode}
                className={inputClass()}
                placeholder="e.g., CBA, ANZ, Westpac"
                data-testid="offer-form-finance-bank"
              />
            </FormField>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Bank Contact Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Bank Contact Phone Number</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Bank Contact Email Address</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={financeBankContactName}
                      onChange={(e) => setFinanceBankContactName(e.target.value)}
                      disabled={viewMode}
                      className={inputClass()}
                      placeholder="Contact Name"
                      data-testid="offer-form-finance-bank-contact-name"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="tel"
                      value={financeBankContactPhone}
                      onChange={(e) => setFinanceBankContactPhone(e.target.value)}
                      disabled={viewMode}
                      className={inputClass()}
                      placeholder="Phone Number"
                      data-testid="offer-form-finance-bank-contact-phone"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="email"
                      value={financeBankContactEmail}
                      onChange={(e) => setFinanceBankContactEmail(e.target.value)}
                      disabled={viewMode}
                      className={inputClass()}
                      placeholder="Email Address"
                      data-testid="offer-form-finance-bank-contact-email"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
