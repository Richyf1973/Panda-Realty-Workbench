"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Checkbox } from "@repo/ui/checkbox"
import { Input } from "@repo/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/popover"
import { cn } from "@repo/ui/utils"

import { formatAdminEntityListCellDisplay } from "../../admin-entity-list-display-format"
import {
  adminFinalizeAdjacentTabFocusAfterClose,
  adminFocusAdjacentTabStop,
} from "../../admin-focus-adjacent-tab-stop"
import { useAdminCrudFormInteractionLockRegister } from "../../admin-crud-form-interaction-lock-context"
import { adminRelatedInlineNavTargetDomProps } from "../../admin-related-inline-table-arrow-navigation"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"

export type AdminMultiSelectRelationOption = {
  readonly value: string
  readonly row: Record<string, unknown>
}

export function AdminEntityCrudListRelationMultiSelectPopoverControl({
  col,
  relCfg,
  htmlForId,
  "data-testid": dataTestId,
  ariaLabel,
  value,
  emptyChoiceLabel,
  disabled = false,
  compact = false,
  options,
  optionsPending,
  rowColumnKeys,
  excludeValues,
  onApply,
  relatedInlineArrowNavTarget = false,
}: {
  col: AdminEntityColumn
  relCfg: AdminEntityDefinition
  htmlForId: string
  "data-testid": string
  ariaLabel: string
  value: string
  emptyChoiceLabel: string
  disabled?: boolean
  compact?: boolean
  options: readonly AdminMultiSelectRelationOption[]
  optionsPending: boolean
  /** Related column keys; first is emphasized (e.g. DR#). */
  rowColumnKeys: readonly string[]
  /** Lowercase DR / id values already used on other lines (case-insensitive compare for text ids). */
  excludeValues: ReadonlySet<string>
  onApply: (picked: readonly AdminMultiSelectRelationOption[]) => void
  relatedInlineArrowNavTarget?: boolean
}) {
  const listRel = col.listRelation
  if (listRel == null) return null

  const idKey = relCfg.idColumn.jsonKey
  const relatedColumns = relCfg.columns

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const tabExitRef = React.useRef(false)
  const pendingAdjacentTabDirectionRef = React.useRef<1 | -1 | null>(null)

  const tabAnchorHints = React.useMemo(
    () => ({
      htmlForId,
      dataTestId,
    }),
    [dataTestId, htmlForId],
  )

  React.useLayoutEffect(() => {
    if (open) return
    const d = pendingAdjacentTabDirectionRef.current
    if (d == null) return
    pendingAdjacentTabDirectionRef.current = null
    adminFinalizeAdjacentTabFocusAfterClose(
      triggerRef.current,
      d,
      tabAnchorHints,
    )
  }, [open, tabAnchorHints])

  useAdminCrudFormInteractionLockRegister(optionsPending && open)

  const q = query.trim().toLowerCase()
  const rowGridTemplateColumns = React.useMemo(() => {
    return rowColumnKeys
      .map((key, idx) => {
        const meta = relatedColumns.find((c) => c.key === key)
        if (idx === 0) return "minmax(3rem,max-content)"
        if (meta?.valueType === "numeric") return "minmax(6.25rem,1fr)"
        return "minmax(5.75rem,max-content)"
      })
      .join(" ")
  }, [rowColumnKeys, relatedColumns])

  const visible = React.useMemo(() => {
    if (q === "") return [...options]
    return options.filter((o) => {
      const parts = rowColumnKeys.map((key) => {
        const raw = o.row[key]
        const meta = relatedColumns.find((c) => c.key === key)
        const t =
          meta != null
            ? formatAdminEntityListCellDisplay(raw, meta)
            : raw == null
              ? ""
              : String(raw)
        return t.toLowerCase()
      })
      return parts.some((p) => p.includes(q)) || o.value.toLowerCase().includes(q)
    })
  }, [options, q, rowColumnKeys, relatedColumns])

  const toggle = (v: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  const handleApply = () => {
    const picked = options.filter((o) => selected.has(o.value))
    onApply(picked)
    setSelected(new Set())
    setQuery("")
    setOpen(false)
  }

  const trimmed = value.trim()
  const triggerText =
    trimmed !== "" ? trimmed : optionsPending ? "Loading…" : emptyChoiceLabel

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery("")
      setSelected(new Set())
    }
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return
    if (open || disabled || optionsPending) return
    e.preventDefault()
    adminFocusAdjacentTabStop(
      triggerRef.current,
      e.shiftKey ? -1 : 1,
      tabAnchorHints,
    )
  }

  const handleContentTabCapture = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return
    if (e.altKey || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    e.stopPropagation()
    tabExitRef.current = true
    pendingAdjacentTabDirectionRef.current = e.shiftKey ? -1 : 1
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={htmlForId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-busy={optionsPending}
          disabled={disabled || (optionsPending && options.length === 0)}
          {...(relatedInlineArrowNavTarget
            ? adminRelatedInlineNavTargetDomProps(`${dataTestId}--trigger`)
            : { "data-testid": `${dataTestId}--trigger` })}
          onKeyDownCapture={handleTriggerKeyDown}
          className={cn(
            "w-full min-w-0 justify-between font-normal",
            compact ? "h-8 px-2 text-xs" : "min-h-9 px-3 text-sm",
            trimmed === "" && "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "truncate text-left",
              trimmed !== "" && "font-mono tabular-nums",
            )}
          >
            {triggerText}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "z-80 flex w-[min(100vw-1.5rem,48rem)] flex-col gap-0 overflow-hidden p-0 shadow-lg ring-1 ring-border/80",
        )}
        data-testid={`${dataTestId}--popover`}
        onKeyDownCapture={handleContentTabCapture}
        onCloseAutoFocus={(ev) => {
          if (tabExitRef.current) {
            ev.preventDefault()
            tabExitRef.current = false
          }
        }}
      >
        <div className="border-b border-border/80 p-2">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 rounded-full border-border/80 bg-muted/30 pr-3 pl-9 text-sm"
              data-testid={`${dataTestId}--search`}
              aria-label="Filter options"
            />
          </div>
        </div>
        <div
          className="max-h-60 overflow-y-auto overflow-x-auto p-1"
          role="listbox"
          aria-multiselectable="true"
          onWheel={(e) => e.stopPropagation()}
        >
          {optionsPending && options.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No matches.
            </p>
          ) : (
            visible.map((o) => {
              const excluded = excludeValues.has(o.value.trim().toLowerCase())
              const isSelected = selected.has(o.value)
              const primaryKey = rowColumnKeys[0] ?? idKey
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={excluded}
                  tabIndex={excluded ? -1 : 0}
                  data-testid={`${dataTestId}--row--${o.value}`}
                  onClick={() => {
                    if (!excluded) toggle(o.value)
                  }}
                  onKeyDown={(e) => {
                    if (excluded) return
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggle(o.value)
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none",
                    "border-b border-border/40 last:border-b-0",
                    excluded
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer hover:bg-muted/80 focus-visible:bg-muted/80",
                    isSelected && !excluded && "bg-muted/60",
                  )}
                >
                  <span aria-hidden className="inline-flex shrink-0 pointer-events-none">
                    <Checkbox
                      checked={isSelected}
                      disabled={excluded}
                      tabIndex={-1}
                      onCheckedChange={() => {}}
                      className="size-4.5"
                    />
                  </span>
                  <div
                    className="grid min-w-0 flex-1 items-center gap-x-2 gap-y-0"
                    style={{ gridTemplateColumns: rowGridTemplateColumns }}
                  >
                    {rowColumnKeys.map((key, idx) => {
                      const meta = relatedColumns.find((c) => c.key === key)
                      const raw = o.row[key]
                      const text =
                        meta != null
                          ? formatAdminEntityListCellDisplay(raw, meta)
                          : raw == null
                            ? ""
                            : String(raw)
                      const isPrimary = key === primaryKey
                      const isNumeric = meta?.valueType === "numeric"
                      return (
                        <span
                          key={key}
                          className={cn(
                            "min-w-0 whitespace-nowrap tabular-nums",
                            isPrimary && "font-semibold",
                            idx === 1 &&
                              !isNumeric &&
                              "text-center text-muted-foreground",
                            (idx >= 2 || (idx === 1 && isNumeric)) &&
                              "text-right font-medium",
                          )}
                        >
                          {text}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="flex gap-2 border-t border-border/80 p-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 font-normal"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 font-normal"
            disabled={selected.size === 0}
            onClick={handleApply}
            data-testid={`${dataTestId}--apply`}
          >
            Add{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
