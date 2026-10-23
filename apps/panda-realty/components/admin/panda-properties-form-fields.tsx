"use client"

import React, { useEffect, useRef, useState } from "react"
import { useStore, type Store } from "@tanstack/react-store"
import { Mail, Phone } from "lucide-react"

import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"

import type { FieldApi, FormLike, FormStoreState } from "./panda-properties-dialog-form-types"

export function mergedFieldErrorMessages(meta: FieldApi["state"]["meta"]): string[] {
  const out = [...meta.errors]
  const s = meta.errorMap?.onServer
  if (typeof s === "string" && s.trim() !== "") out.push(s)
  return out
}

export function useServerFieldError(form: FormLike, name: string): string | undefined {
  return useStore(form.store as Store<FormStoreState>, (s) => {
    return s.fieldMeta?.[name]?.errorMap?.onServer
  })
}

export function FieldText({
  form,
  name,
  label,
  hideLabel,
  required,
  className,
  prefix,
  suffix,
  contactLink,
  rightAction,
  inputClassName,
  ...rest
}: {
  form: FormLike
  name: string
  label: string
  /** Omit visible label; use `placeholder` on the input as the pseudo-header. `label` is still used for `aria-label`. */
  hideLabel?: boolean
  required?: boolean
  className?: string
  prefix?: string
  suffix?: string
  /** When set, renders a tap-to-call (tel) or tap-to-email (mailto) icon link inside the input when the field has a value. */
  contactLink?: "tel" | "mailto"
  /** Optional node rendered at the right edge of the input, to the left of contactLink when both are present. */
  rightAction?: React.ReactNode
  inputClassName?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur" | "form">) {
  const serverErr = useServerFieldError(form, name)
  const ariaLabel = label + (required ? " (required)" : "")
  return (
    <form.Field
      name={name}
      validators={
        required
          ? {
              onSubmit: ({ value }) => (value.trim() ? undefined : "Required"),
            }
          : undefined
      }
    >
      {(field) => {
        const messages = [...mergedFieldErrorMessages(field.state.meta)]
        if (serverErr) messages.push(serverErr)
        const uniqueMessages = [...new Set(messages)]
        return (
          <div
            className={cn(hideLabel ? "grid gap-1" : "grid gap-1.5", className)}
            data-testid={`panda-properties-form-field--${name}`}
          >
            {hideLabel ? null : (
              <Label htmlFor={`pp-${name}`}>
                {label}
                {required ? (
                  <span className="text-destructive" aria-hidden>
                    {" "}
                    *
                  </span>
                ) : null}
              </Label>
            )}
            <div className="relative">
              {prefix ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">
                  {prefix}
                </span>
              ) : null}
              <Input
                id={`pp-${name}`}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-required={required}
                aria-label={hideLabel ? ariaLabel : undefined}
                className={cn(
                  prefix && "pl-6",
                  (suffix || contactLink) && "pr-8",
                  rightAction && contactLink && "pr-14",
                  rightAction && !contactLink && "pr-8",
                  inputClassName,
                )}
                {...rest}
              />
              {suffix ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">
                  {suffix}
                </span>
              ) : null}
              {rightAction ? (
                <span className={cn("absolute top-1/2 -translate-y-1/2", contactLink ? "right-8" : "right-2")}>
                  {rightAction}
                </span>
              ) : null}
              {contactLink && field.state.value?.trim() ? (
                <a
                  href={`${contactLink}:${field.state.value.trim()}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={contactLink === "tel" ? "Call" : "Send email"}
                  tabIndex={-1}
                  onClick={(e) => e.stopPropagation()}
                >
                  {contactLink === "tel" ? (
                    <Phone className="h-3.5 w-3.5" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                </a>
              ) : null}
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

/** Format a raw numeric string as #,##0.00 (e.g. "700000" → "700,000.00"). */
function formatCurrency(raw: string): string {
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return raw
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Strip formatting chars so only digits and a single decimal remain. */
function stripCurrencyFormat(formatted: string): string {
  return formatted.replace(/[^0-9.]/g, "")
}

export function FieldCurrency({
  form,
  name,
  label,
  prefix,
  className,
}: {
  form: FormLike
  name: string
  label: string
  prefix: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form.Field name={name}>
      {(field) => {
        const displayValue = editing ? field.state.value : formatCurrency(field.state.value)
        return (
          <div
            className={cn("grid gap-1.5", className)}
            data-testid={`panda-properties-form-field--${name}`}
          >
            <Label htmlFor={`pp-${name}`}>{label}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">
                {prefix}
              </span>
              <Input
                ref={inputRef}
                id={`pp-${name}`}
                value={displayValue}
                onChange={(e) => {
                  const raw = stripCurrencyFormat(e.target.value)
                  field.handleChange(raw)
                }}
                onFocus={() => setEditing(true)}
                onBlur={() => {
                  setEditing(false)
                  field.handleBlur()
                }}
                className="pl-6 text-right"
              />
            </div>
            {mergedFieldErrorMessages(field.state.meta).length > 0 ? (
              <p
                className="text-xs text-destructive"
                role="alert"
                data-testid={`panda-properties-form-field-error--${name}`}
              >
                {mergedFieldErrorMessages(field.state.meta).join(", ")}
              </p>
            ) : null}
          </div>
        )
      }}
    </form.Field>
  )
}

/** Normalises a stored ISO timestamp or date string to YYYY-MM-DD for <input type="date">. */
function toYmd(raw: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim())
  return m ? m[1]! : raw.trim()
}

export function FieldDateText({
  form,
  name,
  label,
  className,
  labelAction,
}: {
  form: FormLike
  name: string
  label: string
  className?: string
  labelAction?: React.ReactNode
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <div
          className={cn("grid gap-1.5", className)}
          data-testid={`panda-properties-form-field--${name}`}
        >
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`pp-${name}`}>{label}</Label>
            {labelAction}
          </div>
          <Input
            id={`pp-${name}`}
            type="date"
            value={toYmd(field.state.value)}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        </div>
      )}
    </form.Field>
  )
}

export function CommissionAmountDisplay({
  form,
  acceptedOfferAmount,
  className,
}: {
  form: FormLike
  acceptedOfferAmount: number | null
  className?: string
}) {
  return (
    <form.Subscribe
      selector={(state) => {
        const appraised = parseFloat(String(state.values.appraisedAmount ?? "")) || 0
        const rate = parseFloat(String(state.values.commissionRate ?? "")) || 0
        const base = (acceptedOfferAmount ?? 0) > 0 ? acceptedOfferAmount! : appraised
        return String(base * (rate / 100))
      }}
    >
      {(raw) => {
        const commissionAmount = parseFloat(raw) || 0
        return (
          <div
            className={cn("grid gap-1.5", className)}
            data-testid="panda-properties-form-field--commissionAmount"
          >
            <Label>Commission Amount</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
              <span className="mr-1.5 shrink-0">$</span>
              <span className="flex-1 text-right">
                {commissionAmount > 0
                  ? commissionAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""}
              </span>
            </div>
          </div>
        )
      }}
    </form.Subscribe>
  )
}
