"use client"

import { useEffect, useState } from "react"

import { resolveCoolingOffDays } from "@/lib/cooling-off-days"

import type { OfferConditionsData } from "./offer-conditions-panel"
import { updateOfferConditions } from "./update-offer-conditions-action"

const DEPOSIT_INITIAL_DEFAULT = 2000
const DEPOSIT_BALANCE_DEFAULT = 18000

export function useOfferConditionsState({
  propertyListId,
  propertyType,
  offer,
  contractDate,
  onSaved,
  onContractDateChange,
  suggestedAddress,
}: {
  propertyListId: number
  propertyType: string | null
  offer: OfferConditionsData
  contractDate: Date | null
  onSaved: () => void
  onContractDateChange?: (date: Date | null) => void
  suggestedAddress?: string | null
}) {
  // Cooling-off days derive from property type + the offer's waive answer:
  // Manufactured Home → 21/7, anything else → 5/0. The admin can still override
  // the value, but it no longer defaults to a blanket 5 or collapses to 0 when waived.
  const resolvedCoolingOffDays = resolveCoolingOffDays(propertyType, offer.waiveCoolingOff)
  const [openCalendar, setOpenCalendar] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [isCashOffer, setIsCashOffer] = useState(offer.isCashOffer)
  const [noConditions, setNoConditions] = useState(offer.noConditions)
  const [isSubjectToSale, setIsSubjectToSale] = useState(offer.subjectToSaleStage != null)
  const [subjectToSaleStage, setSubjectToSaleStage] = useState(offer.subjectToSaleStage ?? "To be listed")
  const [subjectToSaleAddress, setSubjectToSaleAddress] = useState(offer.subjectToSaleAddress ?? suggestedAddress ?? "")

  // When cooling off is waived, lock to the resolved waived value (manufactured 7, else 0).
  // Otherwise use the stored value, falling back to the resolved statutory default (manufactured 21, else 5).
  const [coolingOffDays, setCoolingOffDays] = useState(
    offer.waiveCoolingOff
      ? resolvedCoolingOffDays.toString()
      : (offer.coolingOffDays?.toString() ?? resolvedCoolingOffDays.toString()),
  )
  const [financeDays, setFinanceDays] = useState(offer.financeDays?.toString() ?? "")
  const [buildingPestDays, setBuildingPestDays] = useState(offer.buildingPestDays?.toString() ?? "")
  const [dueDiligenceDays, setDueDiligenceDays] = useState(offer.dueDiligenceDays?.toString() ?? "")
  const [subjectToSaleDays, setSubjectToSaleDays] = useState(offer.subjectToSaleDays?.toString() ?? "")
  const [saleOfPropertyDays, setSaleOfPropertyDays] = useState(offer.saleOfPropertyDays?.toString() ?? "")
  const [unconditionalContractDays, setUnconditionalContractDays] = useState(offer.unconditionalContractDays?.toString() ?? "")

  const [depositInitial, setDepositInitial] = useState(offer.depositInitial ?? "")
  const [depositBalance, setDepositBalance] = useState(offer.depositBalance ?? "")
  const [customConditions, setCustomConditions] = useState<Array<{ label: string; days: string }>>(
    (offer.customConditions ?? []).map((c) => ({ label: c.label, days: c.days.toString() })),
  )
  const [conditionNotes, setConditionNotes] = useState(offer.conditionNotes ?? "")
  const [contractDateDraft, setContractDateDraft] = useState<Date | null>(contractDate)

  function setContractDateDraftAndSync(next: Date | null) {
    setContractDateDraft(next)
    setIsDirty(true)
    onContractDateChange?.(next)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setContractDateDraft(contractDate)
  }, [contractDate?.getTime(), offer.buyerOfferId])

  // Sync address state when the offer is refreshed after a save (e.g. null clears the stored value).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSubjectToSaleAddress(offer.subjectToSaleAddress ?? suggestedAddress ?? "")
  }, [offer.buyerOfferId, offer.subjectToSaleAddress])

  function markDirty<T>(setter: (v: T) => void): (v: T) => void {
    return (v: T) => { setter(v); setIsDirty(true) }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSavedOk(false)
    try {
      const result = await updateOfferConditions(offer.buyerOfferId, {
        propertyListId,
        contractDate: contractDateDraft,
        isCashOffer,
        noConditions,
        coolingOffDays: offer.waiveCoolingOff ? resolvedCoolingOffDays : (coolingOffDays ? parseInt(coolingOffDays, 10) : resolvedCoolingOffDays),
        financeDays: financeDays ? parseInt(financeDays, 10) : null,
        buildingPestDays: buildingPestDays ? parseInt(buildingPestDays, 10) : null,
        dueDiligenceDays: dueDiligenceDays ? parseInt(dueDiligenceDays, 10) : null,
        subjectToSaleDays: subjectToSaleDays ? parseInt(subjectToSaleDays, 10) : null,
        subjectToSaleStage: isSubjectToSale ? subjectToSaleStage : null,
        subjectToSaleAddress: isSubjectToSale ? (subjectToSaleAddress.trim() || null) : null,
        saleOfPropertyDays: saleOfPropertyDays ? parseInt(saleOfPropertyDays, 10) : null,
        unconditionalContractDays: unconditionalContractDays ? parseInt(unconditionalContractDays, 10) : null,
        depositInitial: depositInitial ? parseFloat(depositInitial) : DEPOSIT_INITIAL_DEFAULT,
        depositBalance: depositBalance ? parseFloat(depositBalance) : DEPOSIT_BALANCE_DEFAULT,
        customConditions: customConditions
          .filter((c) => c.label.trim() || c.days)
          .map((c) => ({ label: c.label.trim(), days: parseInt(c.days, 10) || 0 })),
        conditionNotes: conditionNotes.trim() || null,
      })
      if (result.success) {
        setSavedOk(true)
        setIsDirty(false)
        if (!isSubjectToSale) {
          setSubjectToSaleAddress(suggestedAddress ?? "")
        }
        onSaved()
        return true
      } else {
        setSaveError(result.error ?? "Failed to save")
        return false
      }
    } catch {
      setSaveError("Failed to save")
      return false
    } finally {
      setSaving(false)
    }
  }

  const dayFieldRows = [
    { id: "cooling-off" as const, label: "Cooling Off (days)", value: coolingOffDays, onChange: markDirty(setCoolingOffDays), placeholder: resolvedCoolingOffDays.toString(), disabled: offer.waiveCoolingOff === true, note: offer.waiveCoolingOff ? `Waived on the offer form — ${resolvedCoolingOffDays} day(s)` : undefined },
    { id: "sale-of-property" as const, label: "Sale of Property (days)", value: saleOfPropertyDays, onChange: markDirty(setSaleOfPropertyDays), placeholder: "" },
    { id: "building-pest" as const, label: "Building & Pest (days)", value: buildingPestDays, onChange: markDirty(setBuildingPestDays), placeholder: "" },
    { id: "unconditional-contract" as const, label: "Unconditional Contract (days)", value: unconditionalContractDays, onChange: markDirty(setUnconditionalContractDays), placeholder: "" },
    { id: "finance" as const, label: "Finance (days)", value: financeDays, onChange: markDirty(setFinanceDays), placeholder: "" },
    { id: "subject-to-sale" as const, label: "Completion Date (days)", value: subjectToSaleDays, onChange: markDirty(setSubjectToSaleDays), placeholder: "" },
    { id: "due-diligence" as const, label: "Due Diligence (days)", value: dueDiligenceDays, onChange: markDirty(setDueDiligenceDays), placeholder: "" },
  ]

  return {
    openCalendar, setOpenCalendar,
    saving, saveError, savedOk, isDirty,
    isCashOffer, setIsCashOffer: markDirty(setIsCashOffer),
    noConditions, setNoConditions: markDirty(setNoConditions),
    isSubjectToSale, setIsSubjectToSale: markDirty(setIsSubjectToSale),
    subjectToSaleStage, setSubjectToSaleStage: markDirty(setSubjectToSaleStage),
    subjectToSaleAddress, setSubjectToSaleAddress: markDirty(setSubjectToSaleAddress),
    depositInitial, setDepositInitial: markDirty(setDepositInitial),
    depositBalance, setDepositBalance: markDirty(setDepositBalance),
    customConditions, setCustomConditions: markDirty(setCustomConditions),
    conditionNotes, setConditionNotes: markDirty(setConditionNotes),
    contractDateDraft, setContractDateDraft: setContractDateDraftAndSync,
    dayFieldRows,
    handleSave,
  }
}
