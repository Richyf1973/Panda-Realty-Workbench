"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"

import { mergedFieldErrorMessages, useServerFieldError } from "./panda-properties-form-fields"
import type { FormLike } from "./panda-properties-dialog-form-types"

export function FieldCombobox({
  form,
  name,
  label,
  required,
  className,
  optionsFetchPath = "/api/admin/property-types/options",
}: {
  form: FormLike
  name: string
  label: string
  required?: boolean
  className?: string
  optionsFetchPath?: string
}) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [normalised, setNormalised] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldRef = useRef<any>(null)
  const serverErr = useServerFieldError(form, name)

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true)
      try {
        const res = await fetch(optionsFetchPath)
        if (res.ok) {
          const data = (await res.json()) as { options: Array<{ value: string; label: string }> }
          setOptions(data.options)
        }
      } catch {
        // silently fail; options will be empty
      } finally {
        setLoading(false)
      }
    }
    void fetchOptions()
  }, [optionsFetchPath])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    setNormalised(false)
  }, [options])

  useEffect(() => {
    if (fieldRef.current && !normalised && options.length > 0) {
      const displayValue = fieldRef.current.state.value || ""
      if (displayValue && !options.some((opt) => opt.value === displayValue)) {
        const canonical = options.find(
          (opt) => opt.value.toLowerCase() === displayValue.toLowerCase(),
        )
        if (canonical && canonical.value !== displayValue) {
          fieldRef.current.handleChange(canonical.value)
          setNormalised(true)
        }
      }
    }
  }, [normalised, options])

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const ariaLabel = label + (required ? " (required)" : "")

  return (
    <form.Field
      name={name}
      validators={
        required
          ? {
              onSubmit: ({ value }) => {
                if (!value.trim()) return "Required"
                if (!options.some((opt) => opt.value === value)) return "Must select from list"
                return undefined
              },
            }
          : {
              onSubmit: ({ value }) => {
                if (value.trim() && !options.some((opt) => opt.value === value))
                  return "Must select from list"
                return undefined
              },
            }
      }
    >
      {(field) => {
        fieldRef.current = field
        const displayValue = field.state.value || ""
        const messages = [...mergedFieldErrorMessages(field.state.meta)]
        if (serverErr) messages.push(serverErr)
        const uniqueMessages = [...new Set(messages)]

        return (
          <div
            className={cn("grid gap-1.5", className)}
            data-testid={`panda-properties-form-field--${name}`}
          >
            <Label htmlFor={`pp-${name}`}>
              {label}
              {required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </Label>
            <div ref={containerRef} className="relative">
              <Input
                ref={inputRef}
                id={`pp-${name}`}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                value={isOpen ? searchQuery : displayValue}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!isOpen) setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false)
                    setSearchQuery("")
                    e.preventDefault()
                  } else if (e.key === "Enter" && filteredOptions.length > 0 && isOpen) {
                    field.handleChange(filteredOptions[0]!.value)
                    setIsOpen(false)
                    setSearchQuery("")
                    e.preventDefault()
                  } else if (e.key === "ArrowDown" && isOpen && inputRef.current) {
                    const listbox = containerRef.current?.querySelector("[role='listbox']")
                    const firstOption = listbox?.querySelector("[role='option']") as HTMLElement
                    firstOption?.focus()
                    e.preventDefault()
                  }
                }}
                placeholder="Select a type…"
                className="pr-9"
                aria-required={required}
                aria-label={ariaLabel}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(!isOpen)}
                tabIndex={-1}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div
                  role="listbox"
                  className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                >
                  {loading ? (
                    <div className="flex items-center justify-center p-3">
                      <span className="text-sm text-muted-foreground">Loading…</span>
                    </div>
                  ) : options.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      No types available — run Sync in Settings.
                    </p>
                  ) : filteredOptions.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No types found.</p>
                  ) : (
                    <ul className="max-h-48 overflow-auto py-1">
                      {filteredOptions.map((opt) => (
                        <li key={opt.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={displayValue === opt.value}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm transition-colors",
                              displayValue === opt.value ? "bg-accent font-medium" : "hover:bg-accent",
                            )}
                            onClick={() => {
                              field.handleChange(opt.value)
                              setIsOpen(false)
                              setSearchQuery("")
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {uniqueMessages.length > 0 ? (
              <p
                className="text-xs text-destructive"
                role="alert"
                data-testid={`panda-properties-form-field-error--${name}`}
              >
                {uniqueMessages.join(", ")}
              </p>
            ) : null}
          </div>
        )
      }}
    </form.Field>
  )
}
