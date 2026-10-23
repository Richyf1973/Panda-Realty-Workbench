"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"

/**
 * General keyword search bar shown above the properties grid when the Favorites filter is active.
 * Searches owner names and street address directly on the property row, plus linked entity
 * names/emails/contacts and property-level notes — all via the "generalSearch" appendListWhereHint
 * handled in pandaPropertiesAppendListWhere.
 *
 * Visibility: shown when isFavorite is "true" or absent (defaultSegment is "true").
 * Trigger: submit (Enter key or Search button).
 */
export function PropertiesGeneralSearchBar() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const isFavoriteParam = searchParams.get("isFavorite")
  // defaultSegment is "true", so absent param also means favorites-only
  const isFavoriteActive = isFavoriteParam === "true" || isFavoriteParam === null

  const currentValue = searchParams.get("generalSearch") ?? ""
  const [inputValue, setInputValue] = useState(currentValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input when URL changes externally (e.g. clear filters)
  useEffect(() => {
    setInputValue(searchParams.get("generalSearch") ?? "")
  }, [searchParams])

  if (!isFavoriteActive) return null

  function submit() {
    const params = new URLSearchParams(searchParams.toString())
    if (inputValue.trim()) {
      params.set("generalSearch", inputValue.trim())
    } else {
      params.delete("generalSearch")
    }
    router.push(`?${params.toString()}`)
  }

  function clear() {
    setInputValue("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("generalSearch")
    router.push(`?${params.toString()}`)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-center gap-2 w-full md:w-auto"
      data-testid="properties-general-search-form"
    >
      <div className="relative flex flex-1 md:flex-none items-center">
        <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search owners, buyers, contacts, notes…"
          className="pl-7 pr-7 h-7 w-full md:w-56"
          data-testid="properties-general-search-input"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={clear}
            className="absolute right-1 text-muted-foreground"
            aria-label="Clear search"
            data-testid="properties-general-search-clear"
          >
            <X />
          </Button>
        )}
      </div>
      <Button
        type="submit"
        size="sm"
        data-testid="properties-general-search-submit"
      >
        Search
      </Button>
    </form>
  )
}
