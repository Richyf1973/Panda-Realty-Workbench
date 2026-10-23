"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@repo/ui/button"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"
import type { PrefillData } from "@/components/offer-form/offer-form-types"

import { Divider } from "./buyer-offer-native-view-helpers"
import { NativeSection4 } from "./buyer-offer-native-view-section4"
import {
  NativeSection1,
  NativeSection2,
  NativeSection3,
} from "./buyer-offer-native-view-sections"
import { NativeSection6, NativeSectionMultiOffer } from "./buyer-offer-native-view-sections-5-6"

interface BuyerOfferNativeViewProps {
  token: string | null
  offerId: number
  onSaved?: () => void
  onCancel?: () => void
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>
}

function setNestedValue(obj: PrefillData, path: string, value: unknown): PrefillData {
  const keys = path.split(".")
  const result = { ...obj }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = result
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    const idx = parseInt(key, 10)
    if (!isNaN(idx)) {
      const arr = Array.isArray(cur) ? [...cur] : []
      cur[key] = { ...arr[idx] }
      cur = cur[key]
    } else {
      cur[key] = Array.isArray(cur[key]) ? [...cur[key]] : { ...cur[key] }
      cur = cur[key]
    }
  }
  cur[keys[keys.length - 1]!] = value
  return result
}

export function BuyerOfferNativeView({
  token,
  offerId,
  onSaved,
  onCancel,
  saveRef,
}: BuyerOfferNativeViewProps) {
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [draft, setDraft] = useState<PrefillData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirty = draft !== null && draft !== prefill

  useEffect(() => {
    setPrefill(null)
    setDraft(null)
    setLoadError(null)
    setSaveError(null)
    const controller = new AbortController()
    const url = token
      ? `/api/offer-form/${token}?${new URLSearchParams({ offerId: String(offerId), view: "1" }).toString()}`
      : `/api/admin/buyer-offers/${offerId}/form-view`
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          setLoadError("Failed to load offer details.")
          return
        }
        const data = (await res.json()) as PrefillData
        setPrefill(data)
        setDraft(data)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return
        setLoadError("Network error loading offer details.")
      })
    return () => controller.abort()
  }, [token, offerId, retryCount])

  const handleSave = useCallback(async () => {
    if (!draft || !isDirty) return
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        buyers: draft.buyers.map((b) => ({
          name: b.name,
          phone: b.phone,
          email: b.email,
          address: b.address,
          hasRep: !!draft.rep,
          repName: draft.rep?.name,
          repPhone: draft.rep?.phone,
          repEmail: draft.rep?.email,
          repIsPreferredContact: draft.rep?.isPreferredContact,
        })),
        offerAmount: draft.offerAmount ?? "",
        initialPayment: draft.depositInitial,
        secondPayment: draft.depositBalance,
        cashBuyer: draft.isCashOffer === true ? "Yes" : draft.isCashOffer === false ? "No" : undefined,
        waiveCoolingOff: draft.waiveCoolingOff,
        subjectToFinance: draft.isSubjectToFinance,
        financePreApproved: draft.financePreApproved,
        financeApprovalDays: draft.financeApprovalDays,
        financeBank: draft.financeBank,
        financeBankContactName: draft.financeBankContactName,
        financeBankContactPhone: draft.financeBankContactPhone,
        financeBankContactEmail: draft.financeBankContactEmail,
        buildingPestInspection:
          draft.buildingPestDays === 7
            ? "7_days"
            : draft.buildingPestDays === 14
              ? "14_days"
              : draft.buildingPestDays === 0
                ? "no"
                : undefined,
        suggestBuildingCompanies: draft.suggestBuildingCompanies,
        subjectToSale: draft.isSubjectToSale,
        salePropertyAddress: draft.subjectToSaleAddress,
        saleStatus: draft.subjectToSaleStage,
        saleDaysBeforeListing: draft.saleDaysBeforeListing,
        saleDaysToContract: draft.saleDaysToContract,
        saleDaysToUnconditional: draft.saleDaysToUnconditional,
        saleDaysToSettle: draft.saleDaysToSettle,
        saleIsUnconditional: draft.subjectToSaleStage === "under_contract_unconditional"
          ? true
          : draft.subjectToSaleStage === "under_contract_conditional"
            ? false
            : null,
        saleUnconditionalDate: draft.saleUnconditionalDate,
        saleBuyerSettlementDate: draft.saleBuyerSettlementDate,
        saleActiveConditions: draft.saleActiveConditions,
        saleConditionsElaboration: draft.saleConditionsElaboration,
        saleFreeAppraisal: draft.saleFreeAppraisal,
        settlementPeriod: draft.settlementPeriod,
        settlementDate: draft.settlementDate,
        extraComments: draft.conditionNotes,
        solicitorName: draft.solicitorName,
        solicitorPhone: draft.solicitorPhone,
        solicitorAddress: draft.solicitorAddress,
        solicitorEmail: draft.solicitorEmail,
        multiOfferCheckHighest: draft.multiOfferCheckHighest ?? false,
        multiOfferCheckDiscretion: draft.multiOfferCheckDiscretion ?? false,
        multiOfferCheckConfidential: draft.multiOfferCheckConfidential ?? false,
      }
      const res = await fetch(`/api/admin/buyer-offers/${offerId}/form-data`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setSaveError("Failed to save offer details.")
        // Re-throw so callers awaiting this (e.g. the main dialog before-patch hook)
        // can abort the parent save instead of proceeding past a failed offer save.
        throw new Error("offer-save-failed")
      }
      setPrefill(draft)
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (err) {
      if (!(err instanceof Error && err.message === "offer-save-failed")) {
        setSaveError("Network error saving offer details.")
      }
      throw err
    } finally {
      setSaving(false)
    }
  }, [draft, isDirty, offerId, onSaved])

  const handleCancel = useCallback(() => {
    setDraft(prefill)
    setSaveError(null)
    onCancel?.()
  }, [prefill, onCancel])

  // Clear the "Saved ✓" reset timer on unmount — the parent unmounts this view
  // right after onSaved, so the pending timeout would otherwise fire detached.
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  const setDraftField = useCallback((path: string, value: unknown) => {
    setDraft((prev) => (prev ? setNestedValue(prev, path, value) : prev))
    setSaveError(null)
  }, [])

  // Expose save fn via ref (only when dirty).
  // Use a stable wrapper so the outer before-patch hook always calls the
  // latest handleSave (which closes over the current draft) even after
  // multiple field edits while isDirty stays true.
  const saveRefLatest = useRef<(() => Promise<void>) | null>(null)
  saveRefLatest.current = isDirty ? handleSave : null
  useEffect(() => {
    if (saveRef) {
      saveRef.current = async () => { await saveRefLatest.current?.() }
      return () => {
        saveRef.current = null
      }
    }
  }, [saveRef, isDirty])

  if (loadError) {
    return (
      <div
        data-testid={`buyer-offer-native-view-error--${offerId}`}
        className="mt-1 flex items-center gap-3 rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-destructive"
      >
        <span>{loadError}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={`buyer-offer-native-view-retry--${offerId}`}
          onClick={() => setRetryCount((n) => n + 1)}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!draft) {
    return (
      <div
        data-testid={`buyer-offer-native-view-loading--${offerId}`}
        className="mt-1 rounded-md border border-border bg-muted/20 px-4 py-3"
      >
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div
      data-testid={`buyer-offer-native-view--${offerId}`}
      className="mt-1 space-y-4 rounded-md border border-border bg-muted/20 px-4 py-3"
    >
      <NativeSection1 prefill={draft} setDraftField={setDraftField} />
      <Divider />
      <NativeSection2 prefill={draft} setDraftField={setDraftField} />
      <Divider />
      <NativeSection3 prefill={draft} setDraftField={setDraftField} />
      <Divider />
      <NativeSection4 prefill={draft} setDraftField={setDraftField} />
      <Divider />
      <NativeSectionMultiOffer prefill={draft} setDraftField={setDraftField} />
      <Divider />
      <NativeSection6 prefill={draft} setDraftField={setDraftField} />

      {saveError && (
        <p
          data-testid={`buyer-offer-native-view-save-error--${offerId}`}
          className="text-sm text-destructive"
          role="alert"
        >
          {saveError}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Button
          type="button"
          size="sm"
          disabled={saving || !isDirty}
          data-testid={`buyer-offer-native-view-save--${offerId}`}
          onClick={() => { void handleSave() }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          data-testid={`buyer-offer-native-view-cancel--${offerId}`}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
