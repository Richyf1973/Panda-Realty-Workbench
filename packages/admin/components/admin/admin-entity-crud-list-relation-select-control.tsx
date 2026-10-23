"use client"

import * as React from "react"

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
import { adminEntityCrudRelationSelectOptionsForDisplay } from "../../admin-entity-relation-options"
import { adminRelatedInlineNavTargetDomProps } from "../../admin-related-inline-table-arrow-navigation"

/** Radix Select cannot use empty string as a value; map blank FK to this item. */
export const ADMIN_CRUD_FK_EMPTY_SENTINEL = "__admin_crud_fk_empty__"

export function AdminEntityCrudListRelationSelectControl({
  htmlForId,
  "data-testid": dataTestId,
  ariaLabel,
  required,
  value,
  onChange,
  onBlur,
  emptyChoiceLabel,
  loadingChoiceLabel = "Loading…",
  baseOptions,
  optionsPending,
  disabled = false,
  relatedInlineArrowNavTarget = false,
  triggerShowIdOnly = false,
}: {
  htmlForId: string
  "data-testid": string
  ariaLabel: string
  required: boolean
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  emptyChoiceLabel: string
  /** Shown while `optionsPending` and the selected id is not in `baseOptions` yet. */
  loadingChoiceLabel?: string
  baseOptions: readonly { readonly value: string; readonly label: string }[]
  optionsPending: boolean
  /** When true, the trigger is inactive (e.g. parent scope not chosen yet). */
  disabled?: boolean
  relatedInlineArrowNavTarget?: boolean
  /**
   * When true and a value is selected (and not in the resolving state), the trigger shows only the
   * raw id; dropdown options still use their full labels.
   */
  triggerShowIdOnly?: boolean
}) {
  const trimmed = value.trim()
  const { merged, resolving } = adminEntityCrudRelationSelectOptionsForDisplay(
    baseOptions,
    value,
    optionsPending,
  )
  const selectValue =
    trimmed === "" ? ADMIN_CRUD_FK_EMPTY_SENTINEL : trimmed

  const [menuOpen, setMenuOpen] = React.useState(false)
  const tabExitRef = React.useRef(false)
  const pendingAdjacentTabDirectionRef = React.useRef<1 | -1 | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  const tabAnchorHints = React.useMemo(
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

  const handleSelectContentTabCapture = (e: React.KeyboardEvent) => {
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

  React.useLayoutEffect(() => {
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
      value={selectValue}
      open={menuOpen}
      onOpenChange={setMenuOpen}
      onValueChange={(v: string) => {
        // Radix's hidden native <select> (for form submission) fires onChange("") when the
        // controlled value doesn't match any native option yet (options register lazily as
        // SelectItems mount). Empty string is never a valid SelectItem value (Radix throws on it),
        // so v==="" is always a spurious browser event — not a real user selection.
        // The legitimate "clear" action uses ADMIN_CRUD_FK_EMPTY_SENTINEL, handled below.
        if (v === "") return
        onChange(v === ADMIN_CRUD_FK_EMPTY_SENTINEL ? "" : v)
      }}
      disabled={disabled || (optionsPending && baseOptions.length === 0)}
    >
      <SelectTrigger
        ref={triggerRef}
        id={htmlForId}
        aria-label={ariaLabel}
        aria-required={required}
        aria-busy={resolving}
        onBlur={onBlur}
        {...(relatedInlineArrowNavTarget
          ? adminRelatedInlineNavTargetDomProps(dataTestId)
          : { "data-testid": dataTestId })}
        onKeyDownCapture={(e: React.KeyboardEvent<HTMLButtonElement>) => {
          if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return
          if (menuOpen || disabled || (optionsPending && baseOptions.length === 0))
            return
          e.preventDefault()
          adminFocusAdjacentTabStop(
            triggerRef.current,
            e.shiftKey ? -1 : 1,
            tabAnchorHints,
          )
        }}
        className="w-full"
      >
        {triggerShowIdOnly && trimmed !== "" && !resolving ? (
          <span className="line-clamp-1 min-w-0 flex-1 truncate text-left font-mono text-xs tabular-nums">
            {trimmed}
          </span>
        ) : (
          <SelectValue
            placeholder={resolving ? loadingChoiceLabel : emptyChoiceLabel}
          />
        )}
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
