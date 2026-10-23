"use client"

import { useCallback, useState } from "react"

import type { PropertyDialogAggregateFileRow } from "@/lib/property-list-files-aggregate.types"

export function usePropertyFiles(hasSavedProperty: boolean, listIdNum: number) {
  const [items, setItems] = useState<PropertyDialogAggregateFileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    if (!hasSavedProperty) return
    setLoadError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/property-list-files?propertyListId=${listIdNum}`)
      if (!res.ok) throw new Error(`Failed to load files (${res.status})`)
      const data = (await res.json()) as { items?: PropertyDialogAggregateFileRow[] }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load files.")
    } finally {
      setLoading(false)
    }
  }, [hasSavedProperty, listIdNum])

  return { items, setItems, loading, setLoading, loadError, loadItems }
}
