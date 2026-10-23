"use client"

import { useEffect, useRef } from "react"
import { Loader2, Search } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"

import type { BusinessSearchResult } from "./use-business-search"
import { useBusinessSearch } from "./use-business-search"

interface ContactBusinessSearchProps {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  onSelect: (result: BusinessSearchResult) => void
}

export function ContactBusinessSearch({ value, onChange, disabled, onSelect }: ContactBusinessSearchProps) {
  const search = useBusinessSearch()
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const handleSearchClick = async () => {
    await search.search(value)
  }

  const handleSelectResult = (result: BusinessSearchResult) => {
    onSelect(result)
    search.reset()
  }

  useEffect(() => {
    if (search.results.length === 0) return

    const handleClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        search.reset()
      }
    }

    document.addEventListener("click", handleClick, { capture: true })
    return () => {
      document.removeEventListener("click", handleClick, { capture: true })
    }
  }, [search.results.length, search])

  return (
    <div className="flex flex-col gap-1.5" ref={searchContainerRef}>
      <Label htmlFor="pcf-name">Company Name *</Label>
      <div className="relative">
        <div className="flex items-center gap-2">
          <Input
            id="pcf-name"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Full name"
            data-testid="property-contact-dialog-name"
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleSearchClick}
            disabled={search.loading || disabled}
            data-testid="property-contact-dialog-business-search-btn"
            className="h-10 w-10 p-0"
          >
            {search.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {search.error && !search.results.length && (
          <p className="mt-1 text-sm text-destructive" data-testid="property-contact-dialog-business-search-error">
            {search.error}
          </p>
        )}

        {(search.results.length > 0 || (search.results.length === 0 && search.query && !search.error)) && (
          <div
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded border border-border bg-background shadow-md"
            data-testid="property-contact-dialog-business-search-results"
          >
            {search.results.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground" data-testid="property-contact-dialog-business-search-empty">
                No results found
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto">
                {search.results.map((result) => (
                  <li key={result.placeId}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      data-testid={`property-contact-dialog-business-search-result--${result.placeId}`}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <div className="font-medium">{result.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.address}
                        {result.suburb ? `, ${result.suburb}` : ""}
                        {result.state ? ` ${result.state}` : ""}
                        {result.postcode ? ` ${result.postcode}` : ""}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
