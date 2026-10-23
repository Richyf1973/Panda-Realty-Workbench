"use client"

import { OfferFormBuyerCards } from "./offer-form-buyer-cards"
import { OfferFormSection3Finance } from "./offer-form-section3-finance"
import { OfferFormSection4Terms } from "./offer-form-section4-terms"
import { OfferFormSection5MultiOffer } from "./offer-form-section5-multi-offer"
import { OfferFormSignatures } from "./offer-form-signatures"
import { FormField, OfferFormFooter, OfferFormHeader, SectionHeading, inputClass } from "./offer-form-shared"
import { OfferFormSolicitorSection } from "./offer-form-solicitor-section"
import { OfferFormSubmitFooter } from "./offer-form-submit-footer"
import { OfferFormSuccess } from "./offer-form-success"
import type { BuildingPestState, FinanceState, PrefillData, SaleState, SettlementState } from "./offer-form-types"
import { useOfferFormState } from "./use-offer-form-state"

export function OfferFormFields({ token, prefill, viewMode = false }: { token: string; prefill: PrefillData; viewMode?: boolean }) {
  const {
    propertyAddress,
    buyers, setBuyers,
    signatures, setSignatures,
    solicitorName, setSolicitorName,
    solicitorPhone, setSolicitorPhone,
    solicitorAddress, setSolicitorAddress,
    solicitorEmail, setSolicitorEmail,
    offerAmount, setOfferAmount,
    totalDeposit, setTotalDeposit,
    initialPayment, setInitialPayment,
    secondPayment, setSecondPayment,
    cashBuyer, setCashBuyer,
    buildingPestRequired, setBuildingPestRequired,
    buildingPestDays, setBuildingPestDays,
    suggestBuildingCompanies, setSuggestBuildingCompanies,
    waiveCoolingOff, setWaiveCoolingOff,
    subjectToSale, setSubjectToSale,
    salePropertyAddress, setSalePropertyAddress,
    saleStatus, setSaleStatus,
    simultaneousSettlement, setSimultaneousSettlement,
    saleDaysBeforeListing, setSaleDaysBeforeListing,
    saleDaysToContract, setSaleDaysToContract,
    saleDaysToUnconditional, setSaleDaysToUnconditional,
    saleDaysToSettle, setSaleDaysToSettle,
    saleUnconditionalDate, setSaleUnconditionalDate,
    saleBuyerSettlementDate, setSaleBuyerSettlementDate,
    saleActiveConditions, setSaleActiveConditions,
    saleConditionsElaboration, setSaleConditionsElaboration,
    saleFreeAppraisal, setSaleFreeAppraisal,
    subjectToFinance, setSubjectToFinance,
    financePreApproved, setFinancePreApproved,
    financeApprovalDays, setFinanceApprovalDays,
    financeBank, setFinanceBank,
    financeBankContactName, setFinanceBankContactName,
    financeBankContactPhone, setFinanceBankContactPhone,
    financeBankContactEmail, setFinanceBankContactEmail,
    settlementPeriod,
    settlementDate, settlementNote,
    handleSettlementPeriodChange,
    extraComments, setExtraComments,
    multiOfferCheckHighest, setMultiOfferCheckHighest,
    multiOfferCheckDiscretion, setMultiOfferCheckDiscretion,
    multiOfferCheckConfidential, setMultiOfferCheckConfidential,
    submitting, submitted, submitError, validationErrors,
    handleSettlementDateChange, handleSubmit,
    draftStatus, draftSavedAt,
  } = useOfferFormState(token, prefill)

  const buildingPest: BuildingPestState = {
    buildingPestRequired, setBuildingPestRequired,
    buildingPestDays, setBuildingPestDays,
    suggestBuildingCompanies, setSuggestBuildingCompanies,
  }

  const sale: SaleState = {
    subjectToSale, setSubjectToSale,
    salePropertyAddress, setSalePropertyAddress,
    saleStatus, setSaleStatus,
    simultaneousSettlement, setSimultaneousSettlement,
    saleDaysBeforeListing, setSaleDaysBeforeListing,
    saleDaysToContract, setSaleDaysToContract,
    saleDaysToUnconditional, setSaleDaysToUnconditional,
    saleDaysToSettle, setSaleDaysToSettle,
    saleUnconditionalDate, setSaleUnconditionalDate,
    saleBuyerSettlementDate, setSaleBuyerSettlementDate,
    saleActiveConditions, setSaleActiveConditions,
    saleConditionsElaboration, setSaleConditionsElaboration,
    saleFreeAppraisal, setSaleFreeAppraisal,
  }

  const finance: FinanceState = {
    subjectToFinance, setSubjectToFinance,
    financePreApproved, setFinancePreApproved,
    financeApprovalDays, setFinanceApprovalDays,
    financeBank, setFinanceBank,
    financeBankContactName, setFinanceBankContactName,
    financeBankContactPhone, setFinanceBankContactPhone,
    financeBankContactEmail, setFinanceBankContactEmail,
  }

  const settlement: SettlementState = {
    settlementPeriod, settlementDate, settlementNote,
    handleSettlementPeriodChange, handleSettlementDateChange,
  }

  if (submitted) return <OfferFormSuccess />

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
      data-testid="offer-form-page"
    >
      <OfferFormHeader />

      {viewMode && (
        <div
          data-testid="offer-form-view-mode-banner"
          className="mx-8 mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        >
          Admin view — this form is read-only.
        </div>
      )}

      <div className="space-y-8 p-8">
        {/* Section 1 */}
        <div>
          <SectionHeading number={1} title="Property & Buyer Details" />
          <div className="grid grid-cols-1 gap-6">
            <FormField label="Property Address">
              <input
                type="text"
                value={propertyAddress}
                readOnly
                disabled
                className={`${inputClass()} cursor-not-allowed bg-gray-100 text-gray-500`}
                data-testid="offer-form-property-address"
              />
            </FormField>
            <OfferFormBuyerCards buyers={buyers} setBuyers={setBuyers} />
          </div>
          {validationErrors.buyer1Name && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.buyer1Name}</p>
          )}
        </div>

        {/* Section 2 */}
        <div>
          <SectionHeading number={2} title="Solicitor Details" />
          <OfferFormSolicitorSection
            solicitorName={solicitorName} setSolicitorName={setSolicitorName}
            solicitorPhone={solicitorPhone} setSolicitorPhone={setSolicitorPhone}
            solicitorAddress={solicitorAddress} setSolicitorAddress={setSolicitorAddress}
            solicitorEmail={solicitorEmail} setSolicitorEmail={setSolicitorEmail}
            emailError={validationErrors.solicitorEmail}
          />
        </div>

        {/* Section 3 */}
        <OfferFormSection3Finance
          offerAmount={offerAmount} setOfferAmount={setOfferAmount}
          totalDeposit={totalDeposit} setTotalDeposit={setTotalDeposit}
          initialPayment={initialPayment} setInitialPayment={setInitialPayment}
          secondPayment={secondPayment} setSecondPayment={setSecondPayment}
          offerAmountError={validationErrors.offerAmount}
        />

        {/* Section 4 */}
        <OfferFormSection4Terms
          cashBuyer={cashBuyer} setCashBuyer={setCashBuyer}
          buildingPest={buildingPest}
          waiveCoolingOff={waiveCoolingOff} setWaiveCoolingOff={setWaiveCoolingOff}
          sale={sale}
          finance={finance}
          settlement={settlement}
          purchasePropertyAddress={propertyAddress}
          viewMode={viewMode}
        />

        {/* Section 5 */}
        <OfferFormSection5MultiOffer
          multiOfferCheckHighest={multiOfferCheckHighest} setMultiOfferCheckHighest={setMultiOfferCheckHighest}
          multiOfferCheckDiscretion={multiOfferCheckDiscretion} setMultiOfferCheckDiscretion={setMultiOfferCheckDiscretion}
          multiOfferCheckConfidential={multiOfferCheckConfidential} setMultiOfferCheckConfidential={setMultiOfferCheckConfidential}
          errors={validationErrors}
          viewMode={viewMode}
        />

        {/* Section 6 */}
        <div>
          <SectionHeading number={6} title="Special Conditions / Extra Comments" />
          <textarea
            value={extraComments}
            onChange={(e) => setExtraComments(e.target.value)}
            rows={4}
            className={inputClass()}
            placeholder="List any additional inclusion guarantees, exclusions, specific fixture requirements or custom timelines here..."
            data-testid="offer-form-extra-comments"
          />
        </div>

        {/* Section 7 */}
        <div>
          <SectionHeading number={7} title="Purchaser Acknowledgements & Signatures" />
          <OfferFormSignatures
            buyers={buyers}
            signatures={signatures}
            setSignatures={setSignatures}
            signatureErrors={buyers.map((_, i) => validationErrors[`signature_${i}`] ?? "")}
          />
        </div>

        <OfferFormSubmitFooter
          submitError={submitError}
          draftStatus={draftStatus}
          draftSavedAt={draftSavedAt}
          submitting={submitting}
          viewMode={viewMode}
          signaturesSummaryError={validationErrors.signaturesSummary ?? null}
        />
      </div>

      <OfferFormFooter />
    </form>
  )
}
