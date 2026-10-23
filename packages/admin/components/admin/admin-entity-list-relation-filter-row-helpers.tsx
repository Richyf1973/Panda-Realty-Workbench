import { Input } from "@repo/ui/input"

import type { AdminEntityListRelationFilterRow } from "./admin-entity-list-relation-filter-row"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"

export function filterOptionsBySearch(
  options: readonly { value: string; label: string }[],
  query: string,
): { value: string; label: string }[] {
  const q = query.trim().toLowerCase()
  if (q === "") return [...options]
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  )
}

type RelationFilterSearchInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  columnLabel: string
  dataTestId: string
}

export function RelationFilterSearchInput({
  id,
  value,
  onChange,
  columnLabel,
  dataTestId,
}: RelationFilterSearchInputProps) {
  return (
    <Input
      id={id}
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Filter options…"
      autoComplete="off"
      className="h-8 text-sm"
      data-testid={dataTestId}
      aria-label={`Search ${columnLabel} options`}
    />
  )
}

export type RelationFilterRowProps = {
  slug: AdminEntitySlug
  row: AdminEntityListRelationFilterRow
  q: string
  onQChange: (columnKey: string, value: string) => void
  /** Raw stored value from collapsedByKey — semantics differ per variant. */
  collapsedEntry: boolean | undefined
  onSetCollapsedEntry: (columnKey: string, value: boolean) => void
  onRelationFilterChange?: (columnKey: string, value: string) => void
  onRelationMultiFilterChange?: (columnKey: string, values: string[]) => void
}
