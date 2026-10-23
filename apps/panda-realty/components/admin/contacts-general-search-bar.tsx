"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"

/**
 * General search bar for the Contacts page. Submits the `generalSearch` URL param, handled
 * server-side in pandaPropertiesAppendListWhere (slug "contacts") — matches the contact's own
 * fields plus its representatives (entity_members) by name, email, or phone.
 */
export function ContactsGeneralSearchBar() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentValue = searchParams.get("generalSearch") ?? ""
  const [inputValue, setInputValue] = useState(currentValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input when the URL changes externally (e.g. clear filters).
  useEffect(() => {
    setInputValue(searchParams.get("generalSearch") ?? "")
  }, [searchParams])

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
      data-testid="contacts-general-search-form"
    >
      <div className="relative flex flex-1 md:flex-none items-center">
        <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search contacts and representatives…"
          className="pl-7 pr-7 h-7 w-full md:w-64"
          data-testid="contacts-general-search-input"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={clear}
            className="absolute right-1 text-muted-foreground"
            aria-label="Clear search"
            data-testid="contacts-general-search-clear"
          >
            <X />
          </Button>
        )}
      </div>
      <Button type="submit" size="sm" data-testid="contacts-general-search-submit">
        Search
      </Button>
    </form>
  )
}
