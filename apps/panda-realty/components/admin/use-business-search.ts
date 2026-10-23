"use client"

import { useCallback, useState } from "react"

export interface BusinessSearchResult {
  placeId: string
  name: string
  phone: string
  email: string
  address: string
  suburb: string
  state: string
  postcode: string
}

export interface UseBusinessSearchState {
  query: string
  loading: boolean
  results: BusinessSearchResult[]
  error: string | null
}

export interface UseBusinessSearch extends UseBusinessSearchState {
  search: (query: string) => Promise<void>
  reset: () => void
}

export function useBusinessSearch(): UseBusinessSearch {
  const [state, setState] = useState<UseBusinessSearchState>({
    query: "",
    loading: false,
    results: [],
    error: null,
  })

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim()

    if (!trimmed) {
      setState((prev) => ({
        ...prev,
        error: "Enter a business name to search",
        results: [],
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      query: trimmed,
      loading: true,
      error: null,
      results: [],
    }))

    try {
      const res = await fetch(`/api/admin/places/search?q=${encodeURIComponent(trimmed)}`)

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Search failed (${res.status})`)
      }

      const data = (await res.json()) as { items: BusinessSearchResult[] }

      if (data.items.length === 0) {
        setState((prev) => ({
          ...prev,
          results: [],
          error: null,
        }))
      } else {
        setState((prev) => ({
          ...prev,
          results: data.items,
          error: null,
        }))
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Search failed",
        results: [],
      }))
    } finally {
      setState((prev) => ({
        ...prev,
        loading: false,
      }))
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      query: "",
      loading: false,
      results: [],
      error: null,
    })
  }, [])

  return {
    ...state,
    search,
    reset,
  }
}
