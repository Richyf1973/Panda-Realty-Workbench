"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@repo/ui/input"

export function PropertyMapFilterAddressSearch({
  onLocationSelect,
  initialQuery = "",
}: {
  onLocationSelect: (lat: number, lng: number) => void
  /** Seeds the input text at mount only. To change the address after mount, change the parent's `key` prop to force a remount. */
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; lat: number; lng: number }[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSuggestions([])
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      try {
        const res = await fetch(`/api/streets/autocomplete?q=${encodeURIComponent(value)}`, {
          signal: abortRef.current.signal,
        })
        const data = await res.json()
        const items = (data.items ?? []).map((i: { id: string; title: string; lat: number; lng: number }) => ({
          id: i.id,
          title: i.title,
          lat: i.lat,
          lng: i.lng,
        }))
        setSuggestions(items)
        setOpen(items.length > 0)
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          /* ignore */
        }
      }
    }, 300)
  }

  const handleSelect = (s: { id: string; title: string; lat: number; lng: number }) => {
    setQuery(s.title)
    setOpen(false)
    setSuggestions([])
    onLocationSelect(s.lat, s.lng)
  }

  const listboxId = "map-filter-address-listbox"
  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        placeholder="Search for an address…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          data-testid="autocomplete-suggestions"
          className="absolute z-9999 mt-1 w-full rounded-md border border-border bg-background shadow-md text-sm"
        >
          {suggestions.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={false}
              className="cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(s)
              }}
            >
              {s.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
