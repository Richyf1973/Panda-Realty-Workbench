"use client"

import { useCallback, useEffect, useState } from "react"

interface Buyer {
  entityId: number
  propertyEntityId?: number | null
  entityName: string | null
  emailAddress: string | null
}

export interface BuyerOffer {
  buyerOfferId: number
  offer: string
  dateOffered: string | null
  settlementPeriod?: string | null
}

interface UsePropertyFormSendLinkOptions {
  propertyListId: number
  propertyFormId: number
  onSent?: () => void
}

export function usePropertyFormSendLink({
  propertyListId,
  propertyFormId,
  onSent,
}: UsePropertyFormSendLinkOptions) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loadingBuyers, setLoadingBuyers] = useState(false)
  const [buyerOffers, setBuyerOffers] = useState<Map<number, BuyerOffer[]>>(new Map())
  const [selections, setSelections] = useState<Map<number, number | "none">>(new Map())
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyListId) return
    setLoadingBuyers(true)
    setSelections(new Map())
    setBuyerOffers(new Map())
    fetch(`/api/admin/properties/${propertyListId}/buyers`)
      .then(async (res) => {
        if (!res.ok) { setError("Failed to load buyers"); return }
        const data = (await res.json()) as { items: Buyer[] }
        const list = data.items ?? []
        setBuyers(list)
        const buyersToFetch = list.filter((b) => b.emailAddress && b.propertyEntityId)
        await Promise.all(
          buyersToFetch.map(async (buyer) => {
            try {
              const res2 = await fetch(`/api/admin/property-entities/${buyer.propertyEntityId}/buyer-offers`)
              if (!res2.ok) return
              const d = (await res2.json()) as { offers?: BuyerOffer[] }
              setBuyerOffers((prev) => {
                const next = new Map(prev)
                next.set(buyer.entityId, d.offers ?? [])
                return next
              })
            } catch {
              // silently ignore per-buyer fetch failures
            }
          }),
        )
      })
      .catch(() => setError("Network error loading buyers"))
      .finally(() => setLoadingBuyers(false))
  }, [propertyListId])

  const selectOffer = useCallback((entityId: number, selection: number | "none") => {
    setSelections((prev) => {
      const next = new Map(prev)
      next.set(entityId, selection)
      return next
    })
  }, [])

  const buyersWithEmail = buyers.filter((b) => b.emailAddress)
  const isReady =
    buyersWithEmail.length > 0 && buyersWithEmail.every((b) => selections.has(b.entityId))

  const submit = useCallback(async () => {
    const bwEmail = buyers.filter((b) => b.emailAddress)
    if (bwEmail.length === 0 || !bwEmail.every((b) => selections.has(b.entityId))) return

    setSending(true)
    setError(null)
    try {
      const propertyEntityIds = bwEmail
        .filter((b) => b.propertyEntityId)
        .map((b) => b.propertyEntityId as number)

      const buyerOfferIds: Record<number, number> = {}
      for (const buyer of bwEmail) {
        const sel = selections.get(buyer.entityId)
        if (typeof sel === "number" && buyer.propertyEntityId != null) {
          buyerOfferIds[buyer.propertyEntityId] = sel
        }
      }

      const body: Record<string, unknown> = { propertyFormId, propertyListId, propertyEntityIds }
      if (Object.keys(buyerOfferIds).length > 0) body.buyerOfferIds = buyerOfferIds

      const res = await fetch("/api/admin/property-forms/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        setError(d.error ?? "Failed to send")
        return
      }
      onSent?.()
      setSelections(new Map())
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSending(false)
    }
  }, [buyers, selections, propertyFormId, propertyListId, onSent])

  return { buyers, loadingBuyers, buyerOffers, selections, selectOffer, isReady, sending, error, submit }
}
