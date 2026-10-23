"use client"

import { useEffect, useRef, useState } from "react"

import { X } from "lucide-react"

import { Label } from "@repo/ui/label"

import type { EntityEmailItem } from "@/app/api/admin/properties/[id]/entity-emails/route"

import { GROUP_LABELS, GROUP_ORDER, isValidEmail } from "./gmail-chip-utils"

export interface ChipInputProps {
  label: string
  chips: string[]
  onChipsChange: (chips: string[]) => void
  disabled?: boolean
  inputTestId: string
  chipTestId: string
  fieldTestId: string
  entityEmailOptions?: EntityEmailItem[]
  autocompleteTestIdPrefix?: string
}

export function ChipInput({
  label,
  chips,
  onChipsChange,
  disabled,
  inputTestId,
  chipTestId,
  fieldTestId,
  entityEmailOptions,
  autocompleteTestIdPrefix,
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)
  const [userQuery, setUserQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autocompleteTestIdPrefix) return
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setUserQuery(null)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [autocompleteTestIdPrefix])

  const validOptions = (entityEmailOptions ?? []).filter(
    (o) => o.emailAddress && o.emailAddress.trim() !== "",
  )

  const filtered =
    userQuery === null
      ? validOptions
      : validOptions.filter(
          (o) =>
            o.entityName.toLowerCase().includes(userQuery.toLowerCase()) ||
            o.emailAddress.toLowerCase().includes(userQuery.toLowerCase()),
        )

  const groups = GROUP_ORDER.map((type) => ({
    type,
    label: GROUP_LABELS[type],
    items: filtered.filter((o) => o.type === type),
  })).filter((g) => g.items.length > 0)

  function commitCurrent() {
    const trimmed = inputValue.trim().replace(/,$/, "").trim()
    if (!trimmed) return
    onChipsChange([...chips, trimmed])
    setInputValue("")
    setUserQuery(null)
  }

  function handleSelect(email: string) {
    onChipsChange([...chips, email])
    setInputValue("")
    setUserQuery(null)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      commitCurrent()
      setOpen(false)
    } else if (event.key === ",") {
      event.preventDefault()
      commitCurrent()
    } else if (event.key === "Backspace" && inputValue === "" && chips.length > 0) {
      onChipsChange(chips.slice(0, -1))
    } else if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      setInputValue("")
      setUserQuery(null)
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (containerRef.current?.contains(event.relatedTarget as Node)) return
    commitCurrent()
    setOpen(false)
    setUserQuery(null)
  }

  function removeChip(index: number) {
    onChipsChange(chips.filter((_, i) => i !== index))
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5" data-testid={fieldTestId}>
      <Label className="text-sm font-medium">{label}</Label>
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0"
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip, index) => {
          const invalid = !isValidEmail(chip)
          return (
            <span
              key={index}
              data-testid={chipTestId}
              data-invalid={invalid ? "true" : undefined}
              className={
                invalid
                  ? "flex items-center gap-1 rounded-full border border-destructive/60 bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                  : "flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs"
              }
            >
              {chip}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeChip(index)
                }}
                disabled={disabled}
                aria-label={`Remove ${chip}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            if (autocompleteTestIdPrefix) {
              setUserQuery(e.target.value)
              setOpen(true)
            }
          }}
          onFocus={() => {
            if (autocompleteTestIdPrefix) {
              setUserQuery(null)
              setOpen(true)
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={chips.length === 0 ? "Add email addresses…" : ""}
          data-testid={inputTestId}
        />
      </div>

      {autocompleteTestIdPrefix && open && groups.length > 0 && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
          data-testid={`${autocompleteTestIdPrefix}-dropdown`}
        >
          {groups.map((group) => (
            <div key={group.type}>
              <p
                className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                data-testid={`${autocompleteTestIdPrefix}-group--${group.type}`}
              >
                {group.label}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.emailAddress}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item.emailAddress)}
                  data-testid={`${autocompleteTestIdPrefix}-option--${item.emailAddress}`}
                >
                  <span className="font-medium">{item.entityName}</span>
                  <span className="text-xs text-muted-foreground">{item.emailAddress}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
