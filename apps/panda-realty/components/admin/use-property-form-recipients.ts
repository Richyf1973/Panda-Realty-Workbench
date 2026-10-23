"use client"

import { useCallback, useState } from "react"

import type { PropertyFormRecipient } from "./property-form-send-step"

export function usePropertyFormRecipients({ propertyListId }: { propertyListId: number }) {
  const [recipients, setRecipients] = useState<PropertyFormRecipient[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true)
    setError(null)
    try {
      const [buyersResult, contactsResult, tenantsResult] = await Promise.allSettled([
        fetch(`/api/admin/properties/${propertyListId}/buyers`),
        fetch(`/api/admin/properties/${propertyListId}/contacts`),
        fetch(`/api/admin/properties/${propertyListId}/tenants`),
      ])
      const buyers =
        buyersResult.status === "fulfilled" && buyersResult.value.ok
          ? ((await buyersResult.value.json()) as { items: PropertyFormRecipient[] }).items
          : []
      const contacts =
        contactsResult.status === "fulfilled" && contactsResult.value.ok
          ? ((await contactsResult.value.json()) as { items: PropertyFormRecipient[] }).items
          : []
      const tenants =
        tenantsResult.status === "fulfilled" && tenantsResult.value.ok
          ? ((await tenantsResult.value.json()) as { items: PropertyFormRecipient[] }).items
          : []
      const all: PropertyFormRecipient[] = [
        ...buyers.map((b) => ({ ...b, role: "buyer" as const })),
        ...contacts.map((c) => ({ ...c, role: "contact" as const })),
        ...tenants.map((t) => ({ ...t, role: "tenant" as const })),
      ]
      const seen = new Set<number>()
      setRecipients(
        all.filter((r) => {
          if (seen.has(r.entityId)) return false
          seen.add(r.entityId)
          return true
        }),
      )
    } catch {
      setError("Failed to load recipients")
    } finally {
      setLoadingRecipients(false)
    }
  }, [propertyListId])

  function toggleEntity(entityId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(entityId)) next.delete(entityId)
      else next.add(entityId)
      return next
    })
  }

  function reset() {
    setRecipients([])
    setSelected(new Set())
    setError(null)
  }

  return {
    recipients,
    loadingRecipients,
    selected,
    toggleEntity,
    loadRecipients,
    recipientsError: error,
    reset,
  }
}
