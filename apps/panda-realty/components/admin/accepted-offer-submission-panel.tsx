"use client"

import { Pencil, Printer } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { useAdminClientRegistry } from "@repo/admin/admin-client-registry-context"
import { Skeleton } from "@repo/ui/skeleton"

import type { Submission } from "./buyer-offer-submission-panel"
import { BuyerOfferSubmissionPanel } from "./buyer-offer-submission-panel"
import { BuyerOfferNativeView } from "./buyer-offer-native-view"

type FetchState =
  | { state: "loading" }
  | { state: "loaded"; submission: Submission | null }
  | { state: "error" }

/**
 * Toggle a body class only for the duration of this panel's own print, then remove it on afterprint.
 * Scoping the print-isolation CSS to this class keeps other print surfaces unaffected.
 */
function printOfferSubmission() {
  const cls = "printing-offer-submission"
  document.body.classList.add(cls)
  const cleanup = () => {
    document.body.classList.remove(cls)
    window.removeEventListener("afterprint", cleanup)
  }
  window.addEventListener("afterprint", cleanup)
  window.print()
}

export function AcceptedOfferSubmissionPanel({
  propertyEntityId,
  propertyAddress,
  offerId,
  token,
  contractDateOverride,
  disclosureDateOverride,
}: {
  propertyEntityId: number
  propertyAddress?: string
  offerId: number
  token: string | null
  /** Live Contract date from the form — forwarded to the panel so deadlines recompute before saving. */
  contractDateOverride?: string | null
  /** Live Disclosure date from the form — forwarded to the panel for live Cooling Off recompute. */
  disclosureDateOverride?: string | null
}) {
  const { adminEntityCrudBeforePatchRef } = useAdminClientRegistry()
  const [fetchState, setFetchState] = useState<FetchState>({ state: "loading" })
  const [retryKey, setRetryKey] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  // Local ref that BuyerOfferNativeView writes its save fn into.
  const nativeSaveRef = useRef<(() => Promise<void>) | null>(null)

  // While editing, register our save fn into the admin before-patch hook so
  // the main dialog Save changes auto-saves pending offer edits.
  useEffect(() => {
    if (!isEditing || !adminEntityCrudBeforePatchRef) return
    adminEntityCrudBeforePatchRef.current = async () => {
      await nativeSaveRef.current?.()
    }
    return () => {
      adminEntityCrudBeforePatchRef.current = null
    }
  }, [isEditing, adminEntityCrudBeforePatchRef])

  useEffect(() => {
    let cancelled = false
    setFetchState({ state: "loading" })
    async function load() {
      try {
        const res = await fetch(`/api/admin/property-entities/${propertyEntityId}/offer-form-status`)
        if (!res.ok) throw new Error("fetch failed")
        const data = await res.json() as { submission: Submission | null }
        if (!cancelled) setFetchState({ state: "loaded", submission: data.submission })
      } catch {
        if (!cancelled) setFetchState({ state: "error" })
      }
    }
    void load()
    return () => { cancelled = true }
  }, [propertyEntityId, retryKey])

  const retry = useCallback(() => setRetryKey((k) => k + 1), [])

  const handleSaved = useCallback(() => {
    setIsEditing(false)
    setRetryKey((k) => k + 1)
  }, [])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
  }, [])

  if (fetchState.state === "loading") {
    return (
      <div className="space-y-3 py-4" data-testid="panda-properties-sales-accepted-offer-loading">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  if (fetchState.state === "error") {
    return (
      <div className="flex items-center gap-3 py-4" data-testid="panda-properties-sales-accepted-offer-error">
        <p className="text-sm text-destructive">Failed to load submission</p>
        <button
          type="button"
          onClick={retry}
          data-testid="panda-properties-sales-accepted-offer-retry"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!fetchState.submission && !isEditing) {
    return (
      <div data-testid="panda-properties-sales-accepted-offer-no-submission">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offer Form Submission</p>
        <p className="text-sm text-muted-foreground">● Not yet submitted</p>
      </div>
    )
  }

  const printedDate = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const headingRow = (
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offer Form Submission</p>
      <div className="flex items-center gap-1.5">
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            data-testid="offer-submission-edit-button"
            className="print:hidden inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={printOfferSubmission}
          data-testid="offer-submission-print-button"
          className="print:hidden inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Print
        </button>
      </div>
    </div>
  )

  if (isEditing) {
    return (
      <div>
        {headingRow}
        <BuyerOfferNativeView
          offerId={offerId}
          token={token}
          saveRef={nativeSaveRef}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div>
      {headingRow}
      <div data-testid="offer-submission-print-area" className="panda-offer-print-area">
        <div
          data-testid="offer-submission-print-header"
          className="hidden print:block mb-3 border-b border-black pb-2"
        >
          {propertyAddress && <p className="text-sm font-semibold">{propertyAddress}</p>}
          <p className="text-xs">Printed {printedDate}</p>
        </div>
        <BuyerOfferSubmissionPanel
          propertyEntityId={propertyEntityId}
          submission={fetchState.submission!}
          contractDateOverride={contractDateOverride}
          disclosureDateOverride={disclosureDateOverride}
        />
      </div>
    </div>
  )
}
