"use client"

import { adminEntityColumnFormLabel } from "../../admin-entity-column-form-label"
import type { AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { parseManyRelationFormCommaSeparatedIds } from "../../admin-entity-many-relation-form"

export function AdminEntityCrudManyRelationCheckboxControl({
  variant,
  slug,
  col,
  value,
  onChange,
  options,
  optionsPending,
  layout = "default",
  readOnly,
}: {
  variant: "create" | "edit"
  slug: AdminEntitySlug
  col: AdminEntityColumn
  value: string
  onChange: (next: string) => void
  options: readonly { readonly value: string; readonly label: string }[]
  optionsPending: boolean
  /** `sideRail`: full-height scrollable column beside main fields (9fr + 3fr), like list side filters. */
  layout?: "default" | "sideRail"
  readOnly?: boolean
}) {
  const selected = new Set(parseManyRelationFormCommaSeparatedIds(value))
  const testIdPrefix =
    variant === "create" ? "admin-entity-create" : "admin-entity-edit"

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onChange(
      [...next].sort((a, b) => {
        const na = Number(a)
        const nb = Number(b)
        if (Number.isFinite(na) && Number.isFinite(nb) && /^\d+$/.test(a) && /^\d+$/.test(b)) {
          return na - nb
        }
        return a.localeCompare(b)
      }).join(","),
    )
  }

  const checkboxLabels = options.map((o) => {
    const checked = selected.has(o.value)
    return (
      <label
        key={o.value}
        className="flex cursor-pointer items-start gap-2 text-sm leading-tight"
      >
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
          checked={checked}
          disabled={readOnly === true}
          data-testid={`${testIdPrefix}-many-relation-checkbox--${slug}--${col.key}--${o.value}`}
          onChange={() => toggle(o.value, !checked)}
        />
        <span className="min-w-0 wrap-break-word">{o.label}</span>
      </label>
    )
  })

  if (layout === "sideRail") {
    return (
      <div
        role="group"
        aria-label={col.label}
        data-testid={`${testIdPrefix}-many-relation--${slug}--${col.key}`}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/80 bg-background/80 p-2"
      >
        <div className="scrollbar-galaxy min-h-0 flex-1 overflow-y-auto pr-0.5">
          {optionsPending && options.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid={`${testIdPrefix}-many-relation-loading--${slug}--${col.key}`}
            >
              Loading…
            </p>
          ) : options.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid={`${testIdPrefix}-many-relation-empty--${slug}--${col.key}`}
            >
              No options.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">{checkboxLabels}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={adminEntityColumnFormLabel(col)}
      data-testid={`${testIdPrefix}-many-relation--${slug}--${col.key}`}
      className="scrollbar-galaxy grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border/80 bg-background/80 p-2 sm:grid-cols-2 sm:max-h-none sm:overflow-visible"
    >
      {optionsPending && options.length === 0 ? (
        <p
          className="col-span-full text-sm text-muted-foreground"
          data-testid={`${testIdPrefix}-many-relation-loading--${slug}--${col.key}`}
        >
          Loading…
        </p>
      ) : options.length === 0 ? (
        <p
          className="col-span-full text-sm text-muted-foreground"
          data-testid={`${testIdPrefix}-many-relation-empty--${slug}--${col.key}`}
        >
          No options.
        </p>
      ) : (
        checkboxLabels
      )}
    </div>
  )
}
