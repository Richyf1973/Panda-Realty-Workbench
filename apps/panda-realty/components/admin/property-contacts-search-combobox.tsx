"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search } from "lucide-react"

import type { EntitySearchResult } from "./property-contact-types"

interface ContactSearchComboboxProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: EntitySearchResult[]
  searchLoading: boolean
  linking: boolean
  linkError: string | null
  clearLinkError: () => void
  onSelect: (entityId: number) => Promise<void>
}

export function ContactSearchCombobox({
  searchQuery,
  setSearchQuery,
  searchResults,
  searchLoading,
  linking,
  linkError,
  clearLinkError,
  onSelect,
}: ContactSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleSelect(result: EntitySearchResult) {
    try {
      await onSelect(result.entityId)
      setSearchQuery("")
      setOpen(false)
    } catch {
      setOpen(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col gap-1"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setOpen(false)
        }
      }}
    >
      <div className="relative">
        {linking ? (
          <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
        ) : (
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <input
          className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Search existing contacts…"
          value={searchQuery}
          disabled={linking}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            clearLinkError()
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          data-testid="property-contacts-search"
        />
      </div>
      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {searchLoading ? (
            <div className="flex items-center justify-center p-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No contacts found.</p>
          ) : (
            <ul className="max-h-48 overflow-auto py-1">
              {searchResults.map((r) => (
                <li key={r.entityId}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={linking}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      void handleSelect(r)
                    }}
                  >
                    {[r.entityName, r.phoneNumber, r.emailAddress].filter(Boolean).join(" · ")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {linkError && (
        <p className="text-sm text-destructive" role="alert">
          {linkError}
        </p>
      )}
    </div>
  )
}
