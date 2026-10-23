"use client"

import { useEffect, useRef, type MutableRefObject } from "react"

import { Button } from "@repo/ui/button"
import { Checkbox } from "@repo/ui/checkbox"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Textarea } from "@repo/ui/textarea"
import { TooltipProvider } from "@repo/ui/tooltip"

import { CustomConditionFields } from "./offer-conditions-custom-fields"
import { OfferConditionsContractDateField } from "./offer-conditions-contract-date-field"
import { OfferConditionsDayCountFields } from "./offer-conditions-day-count-fields"
import { OfferFormConditionsBadges } from "./offer-form-conditions-badges"
import { useOfferConditionsState } from "./use-offer-conditions-state"

export type OfferConditionsData = {
  buyerOfferId: number
  isCashOffer: boolean
  noConditions: boolean
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  subjectToSaleDays: number | null
  subjectToSaleStage: string | null
  subjectToSaleAddress: string | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  depositInitial: string | null
  depositBalance: string | null
  customConditions: Array<{ label: string; days: number }> | null
  conditionNotes: string | null
  waiveCoolingOff: boolean | null
  isSubjectToFinance: boolean | null
  financePreApproved: boolean | null
  financeBank: string | null
  financeBankContactName: string | null
  financeBankContactPhone: string | null
  financeBankContactEmail: string | null
  suggestBuildingCompanies: boolean | null
  isSubjectToSale: boolean | null
  saleDaysBeforeListingLive: number | null
  saleIsUnconditional: boolean | null
  saleUnconditionalDate: string | null
  saleBuyerSettlementDate: string | null
  saleActiveConditions: string[] | null
  saleFreeAppraisal: boolean | null
  settlementPeriod: string | null
}

export function OfferConditionsPanel({
  propertyListId,
  propertyType,
  offer,
  contractDate,
  onSaved,
  onContractDateChange,
  suggestedAddress,
  conditionsSaveRef,
}: {
  propertyListId: number
  propertyType: string | null
  offer: OfferConditionsData
  contractDate: Date | null
  onSaved: () => void
  onContractDateChange?: (date: Date | null) => void
  suggestedAddress?: string | null
  conditionsSaveRef?: MutableRefObject<(() => Promise<boolean>) | null>
}) {
  const {
    openCalendar, setOpenCalendar,
    saving, saveError, savedOk, isDirty,
    isCashOffer, setIsCashOffer,
    noConditions, setNoConditions,
    isSubjectToSale, setIsSubjectToSale,
    subjectToSaleStage, setSubjectToSaleStage,
    subjectToSaleAddress, setSubjectToSaleAddress,
    depositInitial, setDepositInitial,
    depositBalance, setDepositBalance,
    customConditions, setCustomConditions,
    conditionNotes, setConditionNotes,
    contractDateDraft, setContractDateDraft,
    dayFieldRows,
    handleSave,
  } = useOfferConditionsState({ propertyListId, propertyType, offer, contractDate, onSaved, onContractDateChange, suggestedAddress })

  // Keep a stable wrapper in conditionsSaveRef — always points to the latest handleSave without
  // re-registering the ref on every render (conditionsSaveRef identity is stable).
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    if (!conditionsSaveRef) return
    const stableCallback = () => handleSaveRef.current()
    conditionsSaveRef.current = stableCallback
    return () => {
      if (conditionsSaveRef.current === stableCallback) conditionsSaveRef.current = null
    }
  }, [conditionsSaveRef])

  return (
    <TooltipProvider>
      <div
        className="mt-1 rounded-md border border-border bg-muted/20 px-4 py-3 space-y-3"
        data-testid={`offer-conditions-panel--${offer.buyerOfferId}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contract Conditions
        </p>

        <OfferConditionsContractDateField
          buyerOfferId={offer.buyerOfferId}
          value={contractDateDraft}
          onChange={setContractDateDraft}
        />

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`cash-offer-${offer.buyerOfferId}`}
              checked={isCashOffer}
              onCheckedChange={(v) => setIsCashOffer(v === true)}
            />
            <Label htmlFor={`cash-offer-${offer.buyerOfferId}`} className="cursor-pointer">
              Cash Offer
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`no-conditions-${offer.buyerOfferId}`}
              checked={noConditions}
              onCheckedChange={(v) => setNoConditions(v === true)}
            />
            <Label htmlFor={`no-conditions-${offer.buyerOfferId}`} className="cursor-pointer">
              No Conditions
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`subject-to-sale-${offer.buyerOfferId}`}
              data-testid={`offer-conditions-subject-to-sale-checkbox--${offer.buyerOfferId}`}
              checked={isSubjectToSale}
              onCheckedChange={(v) => setIsSubjectToSale(v === true)}
            />
            <Label htmlFor={`subject-to-sale-${offer.buyerOfferId}`} className="cursor-pointer">
              Subject to sale of property
            </Label>
          </div>
          {isSubjectToSale && (
            <div className="space-y-2 pl-6">
              <Select value={subjectToSaleStage} onValueChange={setSubjectToSaleStage}>
                <SelectTrigger
                  className="h-8 w-48 text-sm"
                  data-testid={`offer-conditions-subject-to-sale-stage--${offer.buyerOfferId}`}
                >
                  <SelectValue placeholder="Stage…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To be listed">To be listed</SelectItem>
                  <SelectItem value="On the Market">On the Market</SelectItem>
                  <SelectItem value="Under Contract">Under Contract</SelectItem>
                  <SelectItem value="Unconditional">Unconditional</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label htmlFor={`subject-to-sale-address-${offer.buyerOfferId}`} className="text-xs text-muted-foreground">
                  Buyers Property to sell
                </Label>
                <Input
                  id={`subject-to-sale-address-${offer.buyerOfferId}`}
                  data-testid={`offer-conditions-subject-to-sale-address--${offer.buyerOfferId}`}
                  value={subjectToSaleAddress}
                  onChange={(e) => setSubjectToSaleAddress(e.target.value)}
                  placeholder="Address of property being sold…"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <OfferConditionsDayCountFields
          buyerOfferId={offer.buyerOfferId}
          contractDateDraft={contractDateDraft}
          openCalendar={openCalendar}
          setOpenCalendar={setOpenCalendar}
          fields={dayFieldRows}
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div className="space-y-1">
            <Label htmlFor={`deposit-initial-${offer.buyerOfferId}`} className="text-xs text-muted-foreground">
              Initial Deposit (default $2,000)
            </Label>
            <Input
              id={`deposit-initial-${offer.buyerOfferId}`}
              type="number"
              min={0}
              value={depositInitial}
              onChange={(e) => setDepositInitial(e.target.value)}
              placeholder="2000"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`deposit-balance-${offer.buyerOfferId}`} className="text-xs text-muted-foreground">
              Balance Deposit (default $18,000)
            </Label>
            <Input
              id={`deposit-balance-${offer.buyerOfferId}`}
              type="number"
              min={0}
              value={depositBalance}
              onChange={(e) => setDepositBalance(e.target.value)}
              placeholder="18000"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <OfferFormConditionsBadges offer={offer} />

        <CustomConditionFields
          buyerOfferId={offer.buyerOfferId}
          contractDateDraft={contractDateDraft}
          openCalendar={openCalendar}
          setOpenCalendar={setOpenCalendar}
          rows={customConditions}
          setRows={setCustomConditions}
        />

        <div className="space-y-1">
          <Label htmlFor={`condition-notes-${offer.buyerOfferId}`} className="text-xs text-muted-foreground">
            Condition Notes
          </Label>
          <Textarea
            id={`condition-notes-${offer.buyerOfferId}`}
            data-testid={`offer-conditions-condition-notes--${offer.buyerOfferId}`}
            value={conditionNotes}
            onChange={(e) => setConditionNotes(e.target.value)}
            placeholder="Internal notes about these conditions…"
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}

        <div className="flex items-center justify-end gap-3">
          {savedOk && (
            <span
              className="text-xs text-green-600 dark:text-green-400"
              data-testid={`offer-conditions-saved-ok--${offer.buyerOfferId}`}
            >
              Saved ✓
            </span>
          )}
          {isDirty && (
            <span
              className="size-2 rounded-full bg-amber-400"
              data-testid={`offer-conditions-dirty-indicator--${offer.buyerOfferId}`}
              aria-label="Unsaved changes"
              role="status"
            />
          )}
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            data-testid={`offer-conditions-save-btn--${offer.buyerOfferId}`}
          >
            {saving ? "Saving…" : "Save conditions"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
