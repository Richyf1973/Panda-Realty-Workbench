"use client"

import { useEffect, useState } from "react"

import { OfferFormFields } from "./offer-form-fields"
import { OfferFormHeader } from "./offer-form-shared"
import type { PrefillData } from "./offer-form-types"

interface OfferFormClientProps {
  token: string
  offerId?: number
  viewMode?: boolean
}

function FormShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
      <OfferFormHeader />
      <div className="px-8 py-10 text-center">{children}</div>
    </div>
  )
}

export function OfferFormClient({ token, offerId, viewMode }: OfferFormClientProps) {
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (offerId != null) params.set("offerId", String(offerId))
    if (viewMode) params.set("view", "1")
    const query = params.toString()
    fetch(`/api/offer-form/${token}${query ? `?${query}` : ""}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) {
          setLoadError("Failed to load form. Please try again.")
          return
        }
        const data = (await res.json()) as PrefillData
        setPrefill(data)
      })
      .catch(() => setLoadError("Network error. Please check your connection."))
  }, [token, offerId, viewMode])

  if (notFound) {
    return (
      <FormShell>
        <div data-testid="offer-form-not-found">
          <h1 className="mb-2 text-xl font-semibold text-stone-800">Form not found</h1>
          <p className="text-sm text-stone-500">
            This offer form link is no longer available or has expired.
          </p>
        </div>
      </FormShell>
    )
  }

  if (loadError) {
    return (
      <FormShell>
        <p className="text-sm text-red-500">{loadError}</p>
      </FormShell>
    )
  }

  if (!prefill) {
    return (
      <FormShell>
        <p className="text-sm text-stone-400">Loading…</p>
      </FormShell>
    )
  }

  return <OfferFormFields token={token} prefill={prefill} viewMode={prefill.viewMode ?? false} />
}
