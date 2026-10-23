"use client"

import { useEffect, useRef, useState } from "react"

import { buildOfferPayload } from "./offer-form-payload"
import type { BuyerCard, PrefillData, SignatureEntry } from "./offer-form-types"
import { useSettlementState } from "./use-settlement-state"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useOfferFormState(token: string, prefill: PrefillData) {
  // Stable id for the initial buyer — useState lazy-init runs exactly once
  const [buyerId] = useState(() => crypto.randomUUID())

  const [propertyAddress, setPropertyAddress] = useState(prefill.propertyAddress ?? "")
  const [buyers, setBuyers] = useState<BuyerCard[]>(() => {
    const seeded = prefill.buyers.length > 0 ? prefill.buyers : [{ name: "", phone: "", email: "", address: "" }]
    return seeded.map((b, i) => ({
      id: i === 0 ? buyerId : crypto.randomUUID(),
      name: b.name,
      phone: b.phone,
      email: b.email,
      address: b.address,
      hasRep: i === 0 && prefill.rep != null,
      repName: i === 0 ? (prefill.rep?.name ?? "") : "",
      repPhone: i === 0 ? (prefill.rep?.phone ?? "") : "",
      repEmail: i === 0 ? (prefill.rep?.email ?? "") : "",
      repIsPreferredContact: i === 0 ? (prefill.rep?.isPreferredContact ?? "yes") : "yes",
    }))
  })
  const [signatures, setSignatures] = useState<SignatureEntry[]>(() => {
    if (prefill.signatures && prefill.signatures.length > 0) return prefill.signatures
    return [{ buyerId, buyerName: prefill.buyers[0]?.name ?? "", data: "", method: "type" as const, signDate: "" }]
  })

  // Sync signature slots when buyers are added or removed, matching by stable id
  useEffect(() => {
    setSignatures((prev) => {
      const prevById = new Map(prev.map((s) => [s.buyerId, s]))
      return buyers.map(
        (b) => prevById.get(b.id) ?? { buyerId: b.id, buyerName: b.name, data: "", method: "type" as const, signDate: "" },
      )
    })
  }, [buyers.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const [solicitorName, setSolicitorName] = useState(prefill.solicitorName ?? "")
  const [solicitorPhone, setSolicitorPhone] = useState(prefill.solicitorPhone ?? "")
  const [solicitorAddress, setSolicitorAddress] = useState(prefill.solicitorAddress ?? "")
  const [solicitorEmail, setSolicitorEmail] = useState(prefill.solicitorEmail ?? "")

  const [offerAmount, setOfferAmount] = useState(prefill.offerAmount ?? "")
  const [totalDeposit, setTotalDeposit] = useState(() => {
    const init = parseInt(prefill.depositInitial ?? "2000") || 0
    const balance = parseInt(prefill.depositBalance ?? "18000") || 0
    return String(init + balance)
  })
  const [initialPayment, setInitialPayment] = useState(prefill.depositInitial ?? "2000")
  const [secondPayment, setSecondPayment] = useState(prefill.depositBalance ?? "18000")

  const [cashBuyer, setCashBuyer] = useState<"yes" | "no">(prefill.isCashOffer ? "yes" : "no")
  const [buildingPestRequired, setBuildingPestRequiredRaw] = useState((prefill.buildingPestDays ?? 0) > 0)
  const [buildingPestDays, setBuildingPestDays] = useState<"7" | "14">(
    prefill.buildingPestDays === 14 ? "14" : "7"
  )
  const [suggestBuildingCompanies, setSuggestBuildingCompanies] = useState<boolean | null>(
    prefill.suggestBuildingCompanies ?? null
  )
  const [waiveCoolingOff, setWaiveCoolingOff] = useState<"yes" | "no">(prefill.waiveCoolingOff ? "yes" : "no")

  function setBuildingPestRequired(v: boolean) {
    setBuildingPestRequiredRaw(v)
    if (!v) {
      setBuildingPestDays("7")
      setSuggestBuildingCompanies(null)
    }
  }

  const [subjectToSale, setSubjectToSale] = useState(prefill.isSubjectToSale ?? false)
  const [salePropertyAddress, setSalePropertyAddress] = useState(prefill.subjectToSaleAddress ?? "")
  const [saleStatus, setSaleStatusRaw] = useState(prefill.subjectToSaleStage ?? "")
  const [simultaneousSettlement, setSimultaneousSettlement] = useState("")

  function setSaleStatus(v: string) {
    setSaleStatusRaw(v)
    if (v !== "to_be_listed") setSaleFreeAppraisal(null)
    setSimultaneousSettlement("")
  }
  const [saleDaysBeforeListing, setSaleDaysBeforeListing] = useState(prefill.saleDaysBeforeListing ?? "")
  const [saleDaysToContract, setSaleDaysToContract] = useState(prefill.saleDaysToContract ?? "")
  const [saleDaysToUnconditional, setSaleDaysToUnconditional] = useState(prefill.saleDaysToUnconditional ?? "")
  const [saleDaysToSettle, setSaleDaysToSettle] = useState(prefill.saleDaysToSettle ?? "")
  const [saleUnconditionalDate, setSaleUnconditionalDate] = useState(prefill.saleUnconditionalDate ?? "")
  const [saleBuyerSettlementDate, setSaleBuyerSettlementDate] = useState(prefill.saleBuyerSettlementDate ?? "")
  const [saleActiveConditions, setSaleActiveConditions] = useState<string[]>(prefill.saleActiveConditions ?? [])
  const [saleConditionsElaboration, setSaleConditionsElaboration] = useState(prefill.saleConditionsElaboration ?? "")
  const [saleFreeAppraisal, setSaleFreeAppraisal] = useState<boolean | null>(prefill.saleFreeAppraisal ?? null)

  const [multiOfferCheckHighest, setMultiOfferCheckHighest] = useState(prefill.multiOfferCheckHighest ?? false)
  const [multiOfferCheckDiscretion, setMultiOfferCheckDiscretion] = useState(prefill.multiOfferCheckDiscretion ?? false)
  const [multiOfferCheckConfidential, setMultiOfferCheckConfidential] = useState(prefill.multiOfferCheckConfidential ?? false)

  const [subjectToFinance, setSubjectToFinance] = useState(prefill.isSubjectToFinance ?? false)
  const [financePreApproved, setFinancePreApproved] = useState<boolean | null>(prefill.financePreApproved ?? null)
  const [financeApprovalDays, setFinanceApprovalDays] = useState(prefill.financeApprovalDays ?? "")
  const [financeBank, setFinanceBank] = useState(prefill.financeBank ?? "")
  const [financeBankContactName, setFinanceBankContactName] = useState(prefill.financeBankContactName ?? "")
  const [financeBankContactPhone, setFinanceBankContactPhone] = useState(prefill.financeBankContactPhone ?? "")
  const [financeBankContactEmail, setFinanceBankContactEmail] = useState(prefill.financeBankContactEmail ?? "")

  const {
    settlementPeriod, setSettlementPeriod,
    settlementDate, settlementNote,
    handleSettlementDateChange, handleSettlementPeriodChange,
  } = useSettlementState({ settlementPeriod: prefill.settlementPeriod, settlementDate: prefill.settlementDate })

  const [extraComments, setExtraComments] = useState(prefill.conditionNotes ?? "")

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)

  const buildPayload = () => buildOfferPayload({
    buyers, offerAmount, totalDeposit, initialPayment, secondPayment,
    cashBuyer, buildingPestRequired, buildingPestDays, suggestBuildingCompanies,
    waiveCoolingOff, settlementPeriod, settlementDate,
    subjectToSale, salePropertyAddress, saleStatus,
    saleDaysBeforeListing, saleDaysToContract, saleDaysToUnconditional, saleDaysToSettle,
    saleUnconditionalDate, saleBuyerSettlementDate, saleActiveConditions, saleConditionsElaboration, saleFreeAppraisal,
    subjectToFinance, financePreApproved, financeApprovalDays, financeBank,
    financeBankContactName, financeBankContactPhone, financeBankContactEmail,
    solicitorName, solicitorPhone, solicitorAddress, solicitorEmail,
    extraComments, signatures,
    multiOfferCheckHighest, multiOfferCheckDiscretion, multiOfferCheckConfidential,
  })

  const buildPayloadRef = useRef(buildPayload)
  useEffect(() => { buildPayloadRef.current = buildPayload })

  useEffect(() => {
    const id = setInterval(async () => {
      const payload = buildPayloadRef.current()
      if (!payload.buyer1Name || !payload.offerAmount) return
      setDraftStatus("saving")
      try {
        const res = await fetch(`/api/offer-form/${token}?draft=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { setDraftStatus("idle"); return }
        const t = new Date()
        setDraftSavedAt(`${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`)
        setDraftStatus("saved")
      } catch {
        setDraftStatus("idle")
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [token])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!buyers[0]?.name.trim()) errs.buyer1Name = "Buyer 1 name is required"
    if (!offerAmount.trim()) errs.offerAmount = "Offer amount is required"
    if (solicitorEmail && !EMAIL_RE.test(solicitorEmail)) errs.solicitorEmail = "Invalid solicitor email"
    if (!multiOfferCheckHighest) errs.multiOfferCheckHighest = "You must confirm your highest and best offer"
    if (!multiOfferCheckDiscretion) errs.multiOfferCheckDiscretion = "You must acknowledge vendor discretion"
    if (!multiOfferCheckConfidential) errs.multiOfferCheckConfidential = "You must acknowledge confidentiality of competing offers"
    let hasSignatureError = false
    signatures.forEach((sig, i) => {
      if (!sig.data.trim()) {
        errs[`signature_${i}`] = "Signature is required"
        hasSignatureError = true
      }
    })
    if (hasSignatureError) errs.signaturesSummary = "All purchasers must sign before submitting"
    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/offer-form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload(),
          signatures: signatures.map((s) => ({
            ...s,
            signDate: s.signDate || new Date().toISOString().split("T")[0],
          })),
        }),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        setSubmitError(d.error ?? "Failed to submit. Please try again.")
        return
      }
      setSubmitted(true)
      setTimeout(() => window.print(), 0)
    } catch {
      setSubmitError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return {
    propertyAddress, setPropertyAddress,
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
    settlementPeriod, setSettlementPeriod,
    settlementDate, settlementNote,
    handleSettlementPeriodChange,
    extraComments, setExtraComments,
    multiOfferCheckHighest, setMultiOfferCheckHighest,
    multiOfferCheckDiscretion, setMultiOfferCheckDiscretion,
    multiOfferCheckConfidential, setMultiOfferCheckConfidential,
    submitting, submitted, submitError, validationErrors,
    handleSettlementDateChange, handleSubmit,
    draftStatus, draftSavedAt,
  }
}
