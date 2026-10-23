"use client"

import { useEffect, useState } from "react"

import { emitGoogleContactsPatchWarnings } from "@/lib/google-contacts-warning-client"

import type { EntitySearchResult, PropertyContact } from "./property-contact-types"

export function usePropertyContactsSearch({
  propertyListId,
  variant,
  contacts,
  onLinked,
}: {
  propertyListId: number | null
  variant: "create" | "edit"
  contacts: PropertyContact[]
  onLinked: () => Promise<void>
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (variant !== "edit" || propertyListId == null) return
    const delay = searchQuery.trim() ? 300 : 0
    const timer = setTimeout(() => {
      void (async () => {
        setSearchLoading(true)
        try {
          const params = new URLSearchParams({ entityCategoryId: "4", limit: "10" })
          if (searchQuery.trim()) params.set("search", searchQuery.trim())
          const res = await fetch(`/api/admin/entities?${params.toString()}`)
          if (!res.ok) return
          const data = (await res.json()) as { items: EntitySearchResult[] }
          setSearchResults(data.items ?? [])
        } catch {
          // non-critical
        } finally {
          setSearchLoading(false)
        }
      })()
    }, delay)
    return () => clearTimeout(timer)
  }, [searchQuery, variant, propertyListId])

  async function linkExistingContact(entityId: number) {
    if (propertyListId == null) return
    if (contacts.some((c) => c.entityId === entityId)) {
      setLinkError("Already added")
      return
    }
    setLinkError(null)
    setLinking(true)
    try {
      const res = await fetch("/api/admin/property-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: String(entityId),
          propertyListId: String(propertyListId),
          isOriginalOwner: "false",
        }),
      })
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (!res.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? `Failed to link contact (${res.status})`)
      }
      emitGoogleContactsPatchWarnings(body)
      await onLinked()
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to link contact.")
    } finally {
      setLinking(false)
    }
  }

  function clearLinkError() {
    setLinkError(null)
  }

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    linking,
    linkError,
    linkExistingContact,
    clearLinkError,
  }
}
