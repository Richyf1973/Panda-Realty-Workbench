"use client"

import { useEffect, useState } from "react"

import type { BuyerOffer } from "./panda-properties-dialog-form-types"

export function usePandaPropertyBuyerOffers(
  entityRowId: string | null | undefined,
  buyerOffersRefetchGeneration: number,
): { offers: BuyerOffer[]; offersLoading: boolean } {
  const [offers, setOffers] = useState<BuyerOffer[]>([])
  const [offersLoading, setOffersLoading] = useState(() => !!entityRowId)

  useEffect(() => {
    if (!entityRowId) return
    const controller = new AbortController()
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- buyer-offers GET: show loading immediately (same as pre-extract effect)
    setOffersLoading(true)
    fetch(`/api/admin/properties/${entityRowId}/buyer-offers`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled) setOffers(Array.isArray(data) ? (data as BuyerOffer[]) : [])
      })
      .catch(() => {
        // Retain previous offers on any error so the panel stays visible
      })
      .finally(() => {
        if (!cancelled) setOffersLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [entityRowId, buyerOffersRefetchGeneration])

  return { offers, offersLoading }
}
