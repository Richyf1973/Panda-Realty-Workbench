"use client"

import { Input } from "@repo/ui/input"
import { cn } from "@repo/ui/utils"
import { useLayoutEffect, useState, type InputHTMLAttributes } from "react"

import { InputGroupInput } from "@repo/ui/input-group"

import type { AdminEntityDecimalAmountInputOptions } from "../../admin-entity-currency-decimal-input"
import {
  adminEntityDecimalAmountInputKeyShouldPass,
  sanitizeAdminEntityDecimalAmountInput,
} from "../../admin-entity-currency-decimal-input"
import { formatAdminEntityDecimalAmountFormDisplay } from "../../admin-entity-list-numeric-format"
import { consumeAdminRelatedInlineProgrammaticFocus } from "../../admin-related-inline-programmatic-focus"
import {
  adminRelatedInlineNavTargetDomProps,
  RELATED_INLINE_NAV_TARGET_ATTR,
} from "../../admin-related-inline-table-arrow-navigation"

function useAdminEntityDecimalAmountFormattedField(
  value: string,
  readOnly: boolean | undefined,
  allowLeadingMinus: boolean | undefined,
): {
  displayValue: string
  decOpts: AdminEntityDecimalAmountInputOptions | undefined
  onFocusCapture: () => void
  onBlurCapture: () => void
} {
  const [focused, setFocused] = useState(false)
  const decOpts =
    allowLeadingMinus === true ? { allowLeadingMinus: true } : undefined

  useLayoutEffect(() => {
    if (readOnly === true || !focused) return
    const el = document.activeElement
    if (!(el instanceof HTMLInputElement)) return
    if (consumeAdminRelatedInlineProgrammaticFocus(el)) return
    const run = () => {
      if (document.activeElement !== el) return
      try {
        /**
         * Select-all after the formatted → plain display swap commits. Skip when focus was restored
         * by related-inline `applyFocus` after a sync bump (see `markAdminRelatedInlineProgrammaticFocus`).
         */
        el.select()
      } catch {
        /* ignore */
      }
    }
    queueMicrotask(run)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run)
    })
  }, [focused, readOnly])

  const showPlainWhileEditing = readOnly !== true && focused
  const displayValue = showPlainWhileEditing
    ? value
    : formatAdminEntityDecimalAmountFormDisplay(value, decOpts)

  return {
    displayValue,
    decOpts,
    onFocusCapture: () => {
      if (readOnly !== true) setFocused(true)
    },
    onBlurCapture: () => {
      if (readOnly !== true) setFocused(false)
    },
  }
}

type AdminSharedDecimalAmountTextInputProps = {
  /** When true, allow and show a single leading minus (signed currency amounts). */
  allowLeadingMinus?: boolean
  /** Related inline table: include in arrow-key grid navigation. */
  relatedInlineArrowNavTarget?: boolean
  id?: string
  name?: string
  "data-testid"?: string
  value: string
  onChange: (nextPlain: string) => void
  onBlur: () => void
  placeholder?: string
  "aria-required"?: boolean
  autoComplete?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"]
  readOnly?: boolean
  tabIndex?: number
  "aria-readonly"?: boolean
  className?: string
  "aria-label"?: string
  /** Related inline: opt out of caret-at-end sync (see `admin-entity-crud-related-collections`). */
  "data-admin-related-inline-preserve-selection"?: string
}

export type AdminEntityCrudCurrencyAmountTextInputProps =
  AdminSharedDecimalAmountTextInputProps

/**
 * Currency amount field: blurred value shows `#,##0.00` (en-US); focused value is plain digits + one `.`
 * for editing, matching list cell formatting.
 */
export function AdminEntityCrudCurrencyAmountTextInput({
  value,
  onChange,
  onBlur,
  readOnly,
  allowLeadingMinus,
  relatedInlineArrowNavTarget,
  "data-testid": dataTestIdProp,
  ...rest
}: AdminEntityCrudCurrencyAmountTextInputProps) {
  const { displayValue, decOpts, onFocusCapture, onBlurCapture } =
    useAdminEntityDecimalAmountFormattedField(value, readOnly, allowLeadingMinus)

  return (
    <InputGroupInput
      {...rest}
      {...(relatedInlineArrowNavTarget === true
        ? dataTestIdProp != null && dataTestIdProp !== ""
          ? adminRelatedInlineNavTargetDomProps(dataTestIdProp)
          : { [RELATED_INLINE_NAV_TARGET_ATTR]: "" }
        : dataTestIdProp != null && dataTestIdProp !== ""
          ? { "data-testid": dataTestIdProp }
          : {})}
      readOnly={readOnly}
      value={displayValue}
      onFocus={() => {
        onFocusCapture()
      }}
      onBlur={() => {
        onBlurCapture()
        onBlur()
      }}
      onChange={(e) =>
        onChange(sanitizeAdminEntityDecimalAmountInput(e.target.value, decOpts))
      }
      onKeyDown={(e) => {
        if (!adminEntityDecimalAmountInputKeyShouldPass(e, decOpts)) {
          e.preventDefault()
        }
      }}
      type="text"
    />
  )
}

export type AdminEntityCrudPlainDecimalAmountTextInputProps =
  AdminSharedDecimalAmountTextInputProps

/**
 * Plain `valueType: "numeric"` field (no currency symbol): same blurred `#,##0.00` display as
 * {@link AdminEntityCrudCurrencyAmountTextInput}; focused editing stays plain digits + one `.`.
 */
export function AdminEntityCrudPlainDecimalAmountTextInput({
  value,
  onChange,
  onBlur,
  readOnly,
  allowLeadingMinus,
  relatedInlineArrowNavTarget,
  "data-testid": dataTestIdProp,
  className,
  ...rest
}: AdminEntityCrudPlainDecimalAmountTextInputProps) {
  const { displayValue, decOpts, onFocusCapture, onBlurCapture } =
    useAdminEntityDecimalAmountFormattedField(value, readOnly, allowLeadingMinus)

  return (
    <Input
      {...rest}
      {...(relatedInlineArrowNavTarget === true
        ? dataTestIdProp != null && dataTestIdProp !== ""
          ? adminRelatedInlineNavTargetDomProps(dataTestIdProp)
          : { [RELATED_INLINE_NAV_TARGET_ATTR]: "" }
        : dataTestIdProp != null && dataTestIdProp !== ""
          ? { "data-testid": dataTestIdProp }
          : {})}
      readOnly={readOnly}
      className={cn(className)}
      value={displayValue}
      onFocus={() => {
        onFocusCapture()
      }}
      onBlur={() => {
        onBlurCapture()
        onBlur()
      }}
      onChange={(e) =>
        onChange(sanitizeAdminEntityDecimalAmountInput(e.target.value, decOpts))
      }
      onKeyDown={(e) => {
        if (!adminEntityDecimalAmountInputKeyShouldPass(e, decOpts)) {
          e.preventDefault()
        }
      }}
      type="text"
    />
  )
}
