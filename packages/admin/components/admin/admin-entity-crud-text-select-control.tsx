"use client"

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"

import {
  adminFinalizeAdjacentTabFocusAfterClose,
  adminFocusAdjacentTabStop,
} from "../../admin-focus-adjacent-tab-stop"
import { adminRelatedInlineNavTargetDomProps } from "../../admin-related-inline-table-arrow-navigation"
import { ADMIN_CRUD_FK_EMPTY_SENTINEL } from "./admin-entity-crud-list-relation-select-control"

function mergeTextSelectOptions(
  options: readonly { readonly value: string; readonly label: string }[],
  currentValueTrimmed: string,
): readonly { readonly value: string; readonly label: string }[] {
  if (currentValueTrimmed === "") return options
  const set = new Set(options.map((o) => o.value))
  if (set.has(currentValueTrimmed)) return options
  return [...options, { value: currentValueTrimmed, label: currentValueTrimmed }]
}

export function AdminEntityCrudTextSelectControl({
  htmlForId,
  "data-testid": dataTestId,
  ariaLabel,
  required,
  value,
  onChange,
  onBlur,
  emptyChoiceLabel,
  options,
  triggerClassName,
  disabled = false,
  relatedInlineArrowNavTarget = false,
}: {
  htmlForId: string
  "data-testid": string
  ariaLabel: string
  required: boolean
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  emptyChoiceLabel: string
  options: readonly { readonly value: string; readonly label: string }[]
  /** e.g. related-row inline editors (`h-8`). */
  triggerClassName?: string
  disabled?: boolean
  relatedInlineArrowNavTarget?: boolean
}) {
  const trimmed = value.trim()
  const merged = useMemo(
    () => mergeTextSelectOptions(options, trimmed),
    [options, trimmed],
  )
  const selectValue =
    trimmed === "" ? ADMIN_CRUD_FK_EMPTY_SENTINEL : trimmed

  const [menuOpen, setMenuOpen] = useState(false)
  const tabExitRef = useRef(false)
  const pendingAdjacentTabDirectionRef = useRef<1 | -1 | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const tabAnchorHints = useMemo(
    () => ({ htmlForId, dataTestId }),
    [dataTestId, htmlForId],
  )

  const closeSelectForTabNavigation = (direction: 1 | -1, pickFirstReal: boolean) => {
    tabExitRef.current = true
    pendingAdjacentTabDirectionRef.current = direction
    if (pickFirstReal && merged.length > 0) {
      onChange(merged[0]!.value)
    }
    setMenuOpen(false)
    onBlur()
  }

  const handleSelectContentTabCapture = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return
    if (e.altKey || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    e.stopPropagation()
    if (e.shiftKey) {
      closeSelectForTabNavigation(-1, false)
      return
    }
    closeSelectForTabNavigation(1, true)
  }

  useLayoutEffect(() => {
    if (menuOpen) return
    const d = pendingAdjacentTabDirectionRef.current
    if (d == null) return
    pendingAdjacentTabDirectionRef.current = null
    adminFinalizeAdjacentTabFocusAfterClose(
      triggerRef.current,
      d,
      tabAnchorHints,
    )
  }, [menuOpen, tabAnchorHints])

  return (
    <Select
      disabled={disabled}
      value={selectValue}
      open={menuOpen}
      onOpenChange={setMenuOpen}
      onValueChange={(v: string) =>
        onChange(v === ADMIN_CRUD_FK_EMPTY_SENTINEL ? "" : v)
      }
    >
      <SelectTrigger
        ref={triggerRef}
        id={htmlForId}
        aria-label={ariaLabel}
        aria-required={required}
        onBlur={onBlur}
        {...(relatedInlineArrowNavTarget
          ? adminRelatedInlineNavTargetDomProps(dataTestId)
          : { "data-testid": dataTestId })}
        onKeyDownCapture={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return
          if (menuOpen) return
          e.preventDefault()
          adminFocusAdjacentTabStop(
            triggerRef.current,
            e.shiftKey ? -1 : 1,
            tabAnchorHints,
          )
        }}
        className={triggerClassName ?? "w-full"}
      >
        <SelectValue placeholder={emptyChoiceLabel} />
      </SelectTrigger>
      <SelectContent
        align="start"
        onKeyDownCapture={handleSelectContentTabCapture}
        onCloseAutoFocus={(ev) => {
          if (tabExitRef.current) {
            ev.preventDefault()
            tabExitRef.current = false
          }
        }}
      >
        <SelectGroup>
          <SelectItem value={ADMIN_CRUD_FK_EMPTY_SENTINEL}>
            {emptyChoiceLabel}
          </SelectItem>
          {merged.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
