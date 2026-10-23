"use client"

import type { Dispatch, ReactNode, SetStateAction } from "react"

import {
  expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded,
  normalizeTrailingCommaOnlyIntegerQtyString,
} from "../../admin-entity-comma-separated-qty-expand"
import {
  adminEntityIntegerInputKeyShouldPass,
  sanitizeAdminEntityIntegerInput,
  type AdminEntityIntegerInputOptions,
} from "../../admin-entity-integer-input"
import { nextCoercedAdminEntityNumericStringOnBlur } from "../../admin-entity-numeric-blur-coerce"
import { adminSelectAllOnInputFocus } from "../../admin-select-all-on-input-focus"
import {
  clearRelatedInlineKeydown,
  isRelatedInlineRecentKeydownTarget,
  recordRelatedInlineKeydown,
} from "../../admin-related-inline-programmatic-focus"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import type {
  AdminEntityColumn,
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import { AdminEntityCrudIntegerSelectControl } from "./admin-entity-crud-integer-select-control"
import { cn } from "@repo/ui/utils"
import { Input } from "@repo/ui/input"

export type RelatedInlineEditableCellArgs = {
  col: AdminEntityColumn
  line: LineRow
  key: string
  value: string
  relatedNavDom: (tid: string) => Record<string, unknown>
  viewRo: boolean
  parentSlug: string
  collection: AdminEntityCrudRelatedCollectionTable
  label: string
  variant: "create" | "edit"
  idKey: string
  childCfg: AdminEntityDefinition
  persistKey: string
  zeroSentinelKeys: ReadonlySet<string>
  implicitLineFieldsFromParentFk: Readonly<Record<string, string>> | undefined
  updateLineRef: { current: (clientKey: string, patch: Record<string, unknown>) => void }
  setLines: Dispatch<SetStateAction<LineRow[]>>
}

export function renderRelatedInlineIntegerCell(
  args: RelatedInlineEditableCellArgs,
): ReactNode {
  const {
    col,
    line,
    key,
    value,
    relatedNavDom,
    viewRo,
    parentSlug,
    collection,
    label,
    variant,
    idKey,
    childCfg,
    persistKey,
    zeroSentinelKeys,
    implicitLineFieldsFromParentFk,
    updateLineRef,
    setLines,
  } = args

  const intOpts = col.integerFormOptions
  if (
    intOpts != null &&
    intOpts.length > 0 &&
    col.integerInputAllowLeadingMinus !== true &&
    col.integerInputAllowCommaSeparatedQuantities !== true
  ) {
    return (
      <AdminEntityCrudIntegerSelectControl
        htmlForId={`related-int-select-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
        data-testid={`admin-entity-crud-related-integer-select--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
        ariaLabel={label}
        required={false}
        value={value}
        onChange={(v) => updateLineRef.current(line.clientKey, { [key]: v })}
        onBlur={() => {}}
        emptyChoiceLabel="Select…"
        options={intOpts}
        triggerClassName="h-8 w-full"
        disabled={viewRo}
        relatedInlineArrowNavTarget={viewRo !== true}
      />
    )
  }
  const intSanOpts: AdminEntityIntegerInputOptions | undefined =
    col.integerInputAllowCommaSeparatedQuantities === true
      ? { allowCommaSeparatedQuantities: true }
      : col.integerInputAllowLeadingMinus
        ? { allowLeadingMinus: true }
        : undefined
  return (
    <Input
      {...relatedNavDom(
        `admin-entity-crud-related-integer-input--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`,
      )}
      className={cn(
        "h-8 text-right tabular-nums",
        viewRo && "bg-muted/30",
      )}
      type="text"
      data-admin-related-inline-preserve-selection=""
      value={value}
      onChange={(e) =>
        updateLineRef.current(line.clientKey, {
          [key]: sanitizeAdminEntityIntegerInput(
            e.target.value,
            intSanOpts,
          ),
        })
      }
      onBlur={(e) => {
        const isRecent = isRelatedInlineRecentKeydownTarget(e.currentTarget)
        // Only clear the recent-keydown guard on a real user blur (Tab, click elsewhere).
        // If applyFocus calls target.focus() on this same element, the browser fires
        // blur+focus on it — clearing the guard here would let the very next applyFocus
        // RAF run setSelectionRange unchecked, corrupting the cursor mid-typing.
        // Skip the clear when a keydown was recorded recently; applyFocus's own
        // target.focus() is the only source of blur while typing.
        if (!isRecent) {
          clearRelatedInlineKeydown(e.currentTarget)
        }
        if (viewRo || !col) return
        const coerced = nextCoercedAdminEntityNumericStringOnBlur(
          col,
          variant,
          value,
        )
        const sanitizedBlur = sanitizeAdminEntityIntegerInput(
          String(e.currentTarget.value ?? ""),
          intSanOpts,
        )
        const qtyForExpand = normalizeTrailingCommaOnlyIntegerQtyString(
          coerced ?? sanitizedBlur,
        )

        if (col.integerInputAllowCommaSeparatedQuantities === true) {
          setLines((prev) => {
            const base =
              coerced != null
                ? prev.map((l) =>
                    l.clientKey === line.clientKey
                      ? { ...l, [key]: coerced }
                      : l,
                  )
                : prev
            const expanded = expandCommaSeparatedIntegerQtyLinesOnBlurIfNeeded(
              base,
              line.clientKey,
              key,
              qtyForExpand,
              idKey,
              childCfg,
              collection,
              persistKey,
              zeroSentinelKeys,
              implicitLineFieldsFromParentFk,
            )
            return expanded ?? base
          })
        } else if (coerced != null) {
          updateLineRef.current(line.clientKey, { [key]: coerced })
        }
      }}
      onFocus={
        viewRo
          ? undefined
          : (ev) =>
              adminSelectAllOnInputFocus(ev, {
                allowInRelatedInlineTable: true,
              })
      }
      onKeyDown={(e) => {
        const el = e.currentTarget
        recordRelatedInlineKeydown(el)
        if (col?.integerInputAllowCommaSeparatedQuantities === true) {
          /** Do not `preventDefault` — closure `value` vs DOM can disagree during fast typing; rely on `sanitize` in `onChange` (same as a plain text field). */
          return
        }
        if (!adminEntityIntegerInputKeyShouldPass(e, intSanOpts, value)) {
          e.preventDefault()
        }
      }}
      placeholder={col?.placeholder}
      aria-label={label}
      inputMode={
        col?.integerInputAllowCommaSeparatedQuantities === true
          ? "text"
          : (col?.inputMode ?? "numeric")
      }
      autoComplete="off"
      readOnly={viewRo}
      aria-readonly={viewRo ? true : undefined}
    />
  )
}
