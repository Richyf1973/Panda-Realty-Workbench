"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Mail, Phone } from "lucide-react"

import { adminEntityBooleanFormChecked } from "../../admin-entity-crud-boolean-form"
import { adminEntityColumnTreatsAsBoolean } from "../../admin-entity-list-cell"
import { adminEntityListRelationUsesCrudAsyncSearch } from "../../admin-entity-list-relation-crud-async"
import type { AdminEntityColumn } from "../../admin-entity-types"
import { sanitizeAdminEntityDecimalAmountInput } from "../../admin-entity-currency-decimal-input"
import { nextCoercedAdminEntityNumericStringOnBlur } from "../../admin-entity-numeric-blur-coerce"
import {
  defaultRelatedEditableMinWidthPx,
  resolveRelatedInlineEditableColumnAlign,
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import {
  clearRelatedInlineKeydown,
  isRelatedInlineRecentKeydownTarget,
  recordRelatedInlineKeydown,
} from "../../admin-related-inline-programmatic-focus"
import { adminRelatedInlineNavTargetDomProps, RELATED_INLINE_NAV_TARGET_ATTR } from "../../admin-related-inline-table-arrow-navigation"
import { ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE } from "../../admin-entity-crud-autocomplete-suppress"
import { adminSelectAllOnInputFocus } from "../../admin-select-all-on-input-focus"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import {
  AdminEntityCrudListRelationMultiSelectPopoverControl,
  type AdminMultiSelectRelationOption,
} from "./admin-entity-crud-list-relation-multi-select-popover-control"
import {
  AdminEntityCrudCurrencyAmountTextInput,
  AdminEntityCrudPlainDecimalAmountTextInput,
} from "./admin-entity-crud-currency-amount-input"
import { AdminEntityCrudListRelationAsyncSearchControl } from "./admin-entity-crud-list-relation-async-search-control"
import { AdminEntityCrudTextSelectControl } from "./admin-entity-crud-text-select-control"
import { AdminEntityCrudListRelationSelectControl } from "./admin-entity-crud-list-relation-select-control"
import { renderRelatedInlineIntegerCell } from "./related-collection-inline-integer-column"
import { renderRelatedInlineDateCell } from "./related-collection-inline-date-text-input-column"
import { Switch } from "@repo/ui/switch"
import { cn } from "@repo/ui/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@repo/ui/input-group"
import { Input } from "@repo/ui/input"

import type { RelatedInlineColumnDefsCtx } from "./related-collection-inline-column-defs"
import { relatedInlineColumnHeaderNode } from "./related-collection-inline-column-defs"

export function buildEditableColumn(
  ctx: RelatedInlineColumnDefsCtx,
  pinEndKey: string | undefined,
  pinStartKey: string | undefined,
  viewRo: boolean,
  key: string,
): ColumnDef<LineRow> {
  const {
    childCfg,
    collection,
    adminEntities,
    idKey,
    parentSlug,
    variant,
    persistKey,
    zeroSentinelKeys,
    implicitLineFieldsFromParentFk,
    crudRelatedRelationOptionsByColumnKeyRef,
    crudInlineRelationAwaitingParentDetailByRelatedSlugRef,
    linesRefForEmbedHydrate,
    wrapRelatedTargetNestedEditBesideControlRef,
    updateLineRef,
    applyMultiSelectFkLinesRef,
    setLines,
    relationAsyncFilterSelectionsByRelatedSlugRef,
    relationNumericMapsRef: _relationNumericMapsRef,
  } = ctx

  const col = childCfg.columns.find((c) => c.key === key) as
    | AdminEntityColumn
    | undefined
  const label = collection.inlineColumnLabelOverrides?.[key] ?? col?.label ?? key
  const editableAlign = resolveRelatedInlineEditableColumnAlign(col)
  const isCurrencyNumeric =
    col?.valueType === "numeric" && Boolean(col.currencySymbol)
  const isPlainNumeric =
    col?.valueType === "numeric" && !col.currencySymbol
  const minW =
    collection.inlineColumnMinWidthsPx?.[key] ??
    defaultRelatedEditableMinWidthPx(col)
  const maxW = collection.inlineColumnMaxWidthsPx?.[key]

  return {
    id: key,
    header: () => relatedInlineColumnHeaderNode(label, editableAlign),
    meta: {
      relatedStickyEnd: pinEndKey != null && pinEndKey === key,
      relatedStickyStart: pinStartKey != null && pinStartKey === key,
      relatedMinWidthPx: minW,
      relatedMaxWidthPx: maxW,
      cellAlign: editableAlign,
    } satisfies RelatedInlineCellColumnMeta,
    cell: ({ row }) => {
      const line = row.original
      const relatedNavDom = (tid: string) =>
        viewRo === true
          ? ({} as Record<string, never>)
          : adminRelatedInlineNavTargetDomProps(tid)
      const value =
        typeof line[key] === "string"
          ? (line[key] as string)
          : String(line[key] ?? "")

      const relationPack =
        crudRelatedRelationOptionsByColumnKeyRef.current[key]

      if (
        col != null &&
        col.listRelation &&
        col.listRelation.crudInlineRelationMultiSelectAppendRows === true &&
        relationPack != null
      ) {
        const lr = col.listRelation
        const relSlug = lr.relatedEntitySlug
        const relCfgMs = adminEntities[relSlug]
        const awaitingParentMs =
          crudInlineRelationAwaitingParentDetailByRelatedSlugRef.current[
            relSlug
          ] === true
        const relIdKeyMs = relCfgMs?.idColumn.jsonKey ?? ""
        const pickerOrderBy = relCfgMs.listRelationPickerOrderBy
        const sortedRowsMs = pickerOrderBy
          ? [...relationPack.rawListRows].sort((a, b) => {
              for (const spec of pickerOrderBy) {
                const col = relCfgMs.columns.find(
                  (c) => c.key === spec.columnKey,
                )
                const aVal = a[spec.columnKey]
                const bVal = b[spec.columnKey]
                let cmp: number
                if (
                  col &&
                  "listSortAsNumeric" in col &&
                  col.listSortAsNumeric
                ) {
                  cmp = Number(aVal ?? 0) - Number(bVal ?? 0)
                } else {
                  cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""))
                }
                if (cmp !== 0) return spec.direction === "desc" ? -cmp : cmp
              }
              return 0
            })
          : relationPack.rawListRows
        const multiOpts: AdminMultiSelectRelationOption[] =
          sortedRowsMs
            .map((row) => {
              const id = row[relIdKeyMs]
              if (id == null) return null
              return { value: String(id), row }
            })
            .filter((x): x is AdminMultiSelectRelationOption => x != null)
        const exclude = new Set<string>()
        /** Use ref so `columns` memo does not depend on `lines` (stable defs → no input remount on each keystroke). */
        for (const l of linesRefForEmbedHydrate.current) {
          const v = String(l[key] ?? "").trim().toLowerCase()
          if (v) exclude.add(v)
        }
        const embedKeyMs = lr.crudInlineCopyDetailEmbedToLineKey
        if (relCfgMs == null || embedKeyMs == null) {
          return (
            <span className="text-xs text-muted-foreground">
              Missing relation config
            </span>
          )
        }
        return wrapRelatedTargetNestedEditBesideControlRef.current(
          key,
          line,
          viewRo,
          <AdminEntityCrudListRelationMultiSelectPopoverControl
            col={col}
            relCfg={relCfgMs}
            htmlForId={`related-multi-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
            data-testid={`admin-entity-crud-related-relation-multi--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
            ariaLabel={label}
            value={value}
            emptyChoiceLabel="Select…"
            disabled={awaitingParentMs || viewRo}
            compact
            options={multiOpts}
            optionsPending={relationPack.optionsPending}
            rowColumnKeys={
              lr.crudInlineMultiSelectRowColumnKeys ?? lr.labelColumnKeys
            }
            excludeValues={exclude}
            onApply={(picked) =>
              applyMultiSelectFkLinesRef.current(
                line.clientKey,
                key,
                embedKeyMs,
                relSlug,
                picked,
              )
            }
            relatedInlineArrowNavTarget={viewRo !== true}
          />,
        )
      }

      if (col != null && adminEntityColumnTreatsAsBoolean(col)) {
        return (
          <div
            className="flex h-8 items-center justify-center px-1"
            {...relatedNavDom(
              `admin-entity-crud-related-boolean-cell--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`,
            )}
          >
            <Switch
              checked={adminEntityBooleanFormChecked(value)}
              onCheckedChange={(c) =>
                updateLineRef.current(line.clientKey, {
                  [key]: c ? "true" : "false",
                })
              }
              disabled={viewRo}
              data-testid={`admin-entity-crud-related-switch--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
              aria-label={label}
              aria-readonly={viewRo ? true : undefined}
            />
          </div>
        )
      }

      if (
        col != null &&
        col.listRelation &&
        adminEntityListRelationUsesCrudAsyncSearch(col)
      ) {
        const relSlug = col.listRelation.relatedEntitySlug
        const asyncSel =
          relationAsyncFilterSelectionsByRelatedSlugRef.current[relSlug]
        const awaitingParent =
          crudInlineRelationAwaitingParentDetailByRelatedSlugRef.current[
            relSlug
          ] === true
        // Merge per-collection seedFixedValues override into the column's crudAsyncSearchCreateRelated
        const collectionSeedOverride = collection.inlineCreateRelatedSeedFixedValues?.[key]
        const colForControl =
          collectionSeedOverride && col.listRelation.crudAsyncSearchCreateRelated
            ? {
                ...col,
                listRelation: {
                  ...col.listRelation,
                  crudAsyncSearchCreateRelated: {
                    ...col.listRelation.crudAsyncSearchCreateRelated,
                    seedFixedValues: {
                      ...(col.listRelation.crudAsyncSearchCreateRelated.seedFixedValues ?? {}),
                      ...collectionSeedOverride,
                    },
                  },
                },
              }
            : col
        const lrEmbedKey = col.listRelation.crudInlineCopyDetailEmbedToLineKey
        const relationDetailEmbedForAsync =
          lrEmbedKey != null &&
          line[lrEmbedKey] != null &&
          typeof line[lrEmbedKey] === "object" &&
          !Array.isArray(line[lrEmbedKey])
            ? (line[lrEmbedKey] as Record<string, unknown>)
            : null
        // preloadedSearch: pass pre-fetched options for client-side filtering
        const preloadedOpts =
          col.listRelation.crudFormUiVariant === "preloadedSearch"
            ? (crudRelatedRelationOptionsByColumnKeyRef.current[key]?.options ?? [])
            : undefined
        return wrapRelatedTargetNestedEditBesideControlRef.current(
          key,
          line,
          viewRo,
          <AdminEntityCrudListRelationAsyncSearchControl
            col={colForControl}
            htmlForId={`related-async-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
            data-testid={`admin-entity-crud-related-relation-async--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
            ariaLabel={label}
            required={false}
            value={value}
            onChange={(v) => updateLineRef.current(line.clientKey, { [key]: v })}
            onBlur={() => {}}
            emptyChoiceLabel={col.listRelation?.crudSelectEmptyLabel ?? "Select…"}
            allowClear={false}
            compact
            disabled={awaitingParent || viewRo}
            relationFilterSelections={asyncSel}
            relatedInlineArrowNavTarget={viewRo !== true}
            relationDetailEmbed={relationDetailEmbedForAsync}
            preloadedOptions={preloadedOpts}
          />,
        )
      }

      if (col?.listRelation && relationPack != null) {
        return wrapRelatedTargetNestedEditBesideControlRef.current(
          key,
          line,
          viewRo,
          <AdminEntityCrudListRelationSelectControl
            htmlForId={`related-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
            data-testid={`admin-entity-crud-related-relation-select--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
            ariaLabel={label}
            required={false}
            value={value}
            onChange={(v) => {
              const patch: Record<string, string> = { [key]: v }
              const seeds = collection.inlineFkFieldSeedFromRelation
              if (seeds && v) {
                const relSlug = col.listRelation!.relatedEntitySlug
                const relIdKey = adminEntities[relSlug]?.idColumn.jsonKey ?? ""
                const rawRow = relIdKey
                  ? relationPack.rawListRows.find((r) => String(r[relIdKey]) === v)
                  : null
                if (rawRow) {
                  for (const seed of seeds) {
                    if (seed.fkColumnKey === key) {
                      patch[seed.targetColumnKey] = String(rawRow[seed.relatedRowColumnKey] ?? "0")
                    }
                  }
                }
              }
              updateLineRef.current(line.clientKey, patch)
            }}
            onBlur={() => {}}
            emptyChoiceLabel={col.listRelation?.crudSelectEmptyLabel ?? "Select…"}
            baseOptions={relationPack.options}
            optionsPending={relationPack.optionsPending}
            triggerShowIdOnly={
              col.listRelation.crudSelectTriggerShowIdOnly === true
            }
            disabled={viewRo}
            relatedInlineArrowNavTarget={viewRo !== true}
          />,
        )
      }

      if (isCurrencyNumeric && col?.currencySymbol) {
        const sym = col.currencySymbol
        return (
          <InputGroup className="h-8">
            <InputGroupAddon>
              <InputGroupText className="tabular-nums">{sym}</InputGroupText>
            </InputGroupAddon>
            <AdminEntityCrudCurrencyAmountTextInput
              className="h-8 text-right tabular-nums"
              allowLeadingMinus={col.currencyAmountAllowLeadingMinus === true}
              value={value}
              onChange={(plain) =>
                updateLineRef.current(line.clientKey, { [key]: plain })
              }
              onBlur={() => {
                if (viewRo) return
                const next = nextCoercedAdminEntityNumericStringOnBlur(
                  col,
                  variant,
                  value,
                )
                if (next != null) {
                  updateLineRef.current(line.clientKey, { [key]: next })
                }
              }}
              inputMode="decimal"
              aria-label={label}
              autoComplete="off"
              readOnly={viewRo}
              relatedInlineArrowNavTarget={viewRo !== true}
              data-admin-related-inline-preserve-selection=""
              data-testid={`admin-entity-crud-related-currency--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
            />
          </InputGroup>
        )
      }

      if (isPlainNumeric) {
        return (
          <AdminEntityCrudPlainDecimalAmountTextInput
            relatedInlineArrowNavTarget={viewRo !== true}
            data-testid={`admin-entity-crud-related-numeric-input--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
            data-admin-related-inline-preserve-selection=""
            className={cn(
              "h-8 text-right tabular-nums",
              viewRo && "bg-muted/30",
            )}
            allowLeadingMinus={
              col?.numericInputAllowLeadingMinus === true
            }
            value={value}
            onChange={(plain) =>
              updateLineRef.current(line.clientKey, {
                [key]: plain,
              })
            }
            onBlur={() => {
              if (viewRo || !col) return
              const next = nextCoercedAdminEntityNumericStringOnBlur(
                col,
                variant,
                value,
              )
              if (next != null) {
                updateLineRef.current(line.clientKey, { [key]: next })
              }
            }}
            placeholder={col?.placeholder}
            aria-label={label}
            inputMode={col?.inputMode ?? "decimal"}
            autoComplete="off"
            readOnly={viewRo}
            aria-readonly={viewRo ? true : undefined}
          />
        )
      }

      if (col?.valueType === "integer" && !col.listRelation) {
        return renderRelatedInlineIntegerCell({
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
        })
      }

      if (col?.valueType === "text" && !col.listRelation) {
        const txtOpts = col.textFormOptions
        if (txtOpts != null && txtOpts.length > 0) {
          return (
            <AdminEntityCrudTextSelectControl
              htmlForId={`related-text-select-${parentSlug}-${collection.jsonKey}-${line.clientKey}-${key}`}
              data-testid={`admin-entity-crud-related-text-select--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`}
              ariaLabel={label}
              required={false}
              value={value}
              onChange={(v) => updateLineRef.current(line.clientKey, { [key]: v })}
              onBlur={() => {}}
              emptyChoiceLabel="Select…"
              options={txtOpts}
              triggerClassName="h-8 w-full"
              disabled={viewRo}
              relatedInlineArrowNavTarget={viewRo !== true}
            />
          )
        }
      }

      if (
        col?.valueType === "text" &&
        !col.listRelation &&
        (col.dateStringFormControl === "yearMonthEnd" ||
          col.dateStringFormControl === "calendar" ||
          col.dateStringFormControl === "textInput")
      ) {
        return renderRelatedInlineDateCell({
          col,
          line,
          key,
          value,
          viewRo,
          variant,
          parentSlug,
          collection,
          updateLineRef,
        })
      }

      if (col?.formControl === "textarea") {
        return (
          <textarea
            {...relatedNavDom(
              `admin-entity-crud-related-textarea--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`,
            )}
            rows={2}
            className={cn(
              "flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none",
              viewRo && "bg-muted/30",
            )}
            value={value}
            onChange={(e) =>
              updateLineRef.current(line.clientKey, { [key]: e.target.value })
            }
            onFocus={viewRo ? undefined : adminSelectAllOnInputFocus}
            placeholder={col.placeholder}
            aria-label={label}
            autoComplete={ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE}
            readOnly={viewRo}
            aria-readonly={viewRo ? true : undefined}
          />
        )
      }

      const linkType = col?.listCellLinkType
      if (linkType && value.trim()) {
        const isPhone = linkType === "tel"
        return (
          <div className="relative">
            <Input
              {...relatedNavDom(
                `admin-entity-crud-related-input--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`,
              )}
              className={cn("h-8 pr-7", viewRo && "bg-muted/30")}
              value={value}
              onChange={(e) =>
                updateLineRef.current(line.clientKey, { [key]: e.target.value })
              }
              onKeyDown={(e) => {
                recordRelatedInlineKeydown(e.currentTarget)
              }}
              onBlur={(e) => {
                if (!isRelatedInlineRecentKeydownTarget(e.currentTarget)) {
                  clearRelatedInlineKeydown(e.currentTarget)
                }
                if (col?.textUppercaseOnBlur && !viewRo) {
                  const nextEl = e.relatedTarget as Element | null
                  if (nextEl?.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR)) {
                    const currentValue = e.currentTarget.value
                    const upper = currentValue.toUpperCase()
                    if (upper !== currentValue) {
                      updateLineRef.current(line.clientKey, { [key]: upper })
                    }
                  }
                }
              }}
              onFocus={viewRo ? undefined : adminSelectAllOnInputFocus}
              placeholder={col?.placeholder}
              aria-label={label}
              inputMode={col?.inputMode}
              autoComplete={ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE}
              readOnly={viewRo}
              aria-readonly={viewRo ? true : undefined}
            />
            <a
              href={`${linkType}:${value.trim()}`}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={isPhone ? "Call" : "Send email"}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              {isPhone ? (
                <Phone className="size-3 shrink-0" />
              ) : (
                <Mail className="size-3 shrink-0" />
              )}
            </a>
          </div>
        )
      }
      return (
        <Input
          {...relatedNavDom(
            `admin-entity-crud-related-input--${parentSlug}--${collection.jsonKey}--${key}--${line.clientKey}`,
          )}
          className={cn("h-8", viewRo && "bg-muted/30")}
          value={value}
          onChange={(e) =>
            updateLineRef.current(line.clientKey, { [key]: e.target.value })
          }
          onKeyDown={(e) => {
            recordRelatedInlineKeydown(e.currentTarget)
          }}
          onBlur={(e) => {
            if (!isRelatedInlineRecentKeydownTarget(e.currentTarget)) {
              clearRelatedInlineKeydown(e.currentTarget)
            }
            if (col?.textUppercaseOnBlur && !viewRo) {
              const nextEl = e.relatedTarget as Element | null
              if (nextEl?.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR)) {
                const currentValue = e.currentTarget.value
                const upper = currentValue.toUpperCase()
                if (upper !== currentValue) {
                  updateLineRef.current(line.clientKey, { [key]: upper })
                }
              }
            }
          }}
          onFocus={viewRo ? undefined : adminSelectAllOnInputFocus}
          placeholder={col?.placeholder}
          aria-label={label}
          inputMode={col?.inputMode}
          autoComplete={ADMIN_ENTITY_CRUD_AUTOCOMPLETE_NOPE}
          readOnly={viewRo}
          aria-readonly={viewRo ? true : undefined}
        />
      )
    },
  } satisfies ColumnDef<LineRow>
}
