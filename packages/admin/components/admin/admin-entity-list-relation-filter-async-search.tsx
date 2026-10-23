"use client"

import * as React from "react"

import { formatRelationFilterAsyncSearchFieldsHint } from "../../admin-entity-relation-filter-async-search-hint"
import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import {
  clampAdminEntityRelationAsyncSearchLimit,
  useAdminEntityDebouncedValue,
  useAdminEntityRelatedListSearchQuery,
  useAdminEntityRelatedRowDetailLabel,
} from "../../admin-entity-relation-async-search-queries"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityDefinition } from "../../admin-entity-types"
import { AdminEntityListRelationFilterAsyncSearchPopover } from "./admin-entity-list-relation-filter-async-search-popover"
import { AdminEntityListRelationFilterAsyncSearchSide } from "./admin-entity-list-relation-filter-async-search-side"

type AdminEntityListRelationFilterAsyncSearchProps = {
  parentSlug: AdminEntitySlug
  columnKey: string
  columnLabel: string
  value: string
  onValueChange: (next: string) => void
  relatedSlug: AdminEntitySlug
  labelColumnKeys: readonly string[]
  /** Shown when non-empty. */
  matchesHint?: string
  /**
   * When true, show derived helper text (from related `listSearch` labels) if {@link matchesHint}
   * is empty. Default off.
   */
  showDerivedMatchesHint?: boolean
  fetchLimit: number
  layout: "popover" | "side"
  /**
   * When true, show “type to query…” when the search box is empty. Default false (no empty-state copy).
   */
  showEmptyQueryHint?: boolean
  /** Full-width trigger + touch-friendly height (mobile filter dialog). */
  fullWidth?: boolean
  /** Match dense desktop list filter toolbar (h-8) when not `fullWidth`. */
  denseDesktop?: boolean
}

export function AdminEntityListRelationFilterAsyncSearch({
  parentSlug,
  columnKey,
  columnLabel,
  value,
  onValueChange,
  relatedSlug,
  labelColumnKeys,
  matchesHint: matchesHintProp,
  showDerivedMatchesHint = false,
  fetchLimit,
  layout,
  showEmptyQueryHint = false,
  fullWidth = false,
  denseDesktop = false,
}: AdminEntityListRelationFilterAsyncSearchProps) {
  const { adminEntities } = useAdminClientRegistry()
  const relCfg = adminEntities[relatedSlug] as AdminEntityDefinition | undefined

  const limit = clampAdminEntityRelationAsyncSearchLimit(fetchLimit)
  const derivedHint = formatRelationFilterAsyncSearchFieldsHint(relCfg)
  const explicitHint = matchesHintProp?.trim() ?? ""
  const showHint =
    explicitHint !== "" || showDerivedMatchesHint === true
  const matchesHint =
    explicitHint ||
    (derivedHint != null
      ? `Server search matches: ${derivedHint}.`
      : "Results load from the server as you type.")

  const [open, setOpen] = React.useState(false)
  const [popoverSearch, setPopoverSearch] = React.useState("")
  const debouncedPopoverSearch = useAdminEntityDebouncedValue(popoverSearch, 280)

  const [sideSearch, setSideSearch] = React.useState("")
  const debouncedSideSearch = useAdminEntityDebouncedValue(sideSearch, 280)

  const searchActive = layout === "popover" ? open : true
  const debouncedSearch =
    layout === "popover" ? debouncedPopoverSearch : debouncedSideSearch

  const listQuery = useAdminEntityRelatedListSearchQuery(
    relCfg,
    debouncedSearch,
    limit,
    searchActive,
  )

  const selectedLabelQuery = useAdminEntityRelatedRowDetailLabel(
    relCfg,
    labelColumnKeys,
    value,
  )

  React.useEffect(() => {
    if (!open) setPopoverSearch("")
  }, [open])

  const idKey = relCfg?.idColumn.jsonKey ?? ""
  const relatedColumns = relCfg?.columns

  const options = React.useMemo(() => {
    const items = (listQuery.data?.items ?? []) as Record<string, unknown>[]
    return items
      .map((row) => {
        const id = row[idKey]
        if (id == null) return null
        const v = String(id)
        const label = adminEntityRelationOptionLabel(
          row,
          labelColumnKeys,
          relatedColumns,
        )
        return {
          value: v,
          label: label.trim() !== "" ? label : v,
        }
      })
      .filter((x): x is { value: string; label: string } => x != null)
  }, [idKey, labelColumnKeys, listQuery.data?.items, relatedColumns])

  const triggerSummary =
    value.trim() === ""
      ? "All"
      : selectedLabelQuery.isPending
        ? "…"
        : (selectedLabelQuery.data ?? value)

  const testIdRoot = `admin-entity-list-relation-filter-async--${parentSlug}--${columnKey}`

  const hintEl = showHint ? (
    <p className="text-xs leading-snug text-muted-foreground">{matchesHint}</p>
  ) : null

  if (layout === "side") {
    return (
      <AdminEntityListRelationFilterAsyncSearchSide
        testIdRoot={testIdRoot}
        parentSlug={parentSlug}
        columnKey={columnKey}
        columnLabel={columnLabel}
        value={value}
        onValueChange={onValueChange}
        hintEl={hintEl}
        showEmptyQueryHint={showEmptyQueryHint}
        sideSearch={sideSearch}
        setSideSearch={setSideSearch}
        listQuery={listQuery}
        debouncedSearch={debouncedSearch}
        options={options}
        selectedLabelQuery={selectedLabelQuery}
      />
    )
  }

  const triggerId = `admin-entity-list-relation-filter--${parentSlug}--${columnKey}`

  return (
    <AdminEntityListRelationFilterAsyncSearchPopover
      testIdRoot={testIdRoot}
      parentSlug={parentSlug}
      columnKey={columnKey}
      columnLabel={columnLabel}
      value={value}
      onValueChange={onValueChange}
      hintEl={hintEl}
      fullWidth={fullWidth}
      denseDesktop={denseDesktop}
      open={open}
      onOpenChange={setOpen}
      popoverSearch={popoverSearch}
      onPopoverSearchChange={setPopoverSearch}
      listQuery={listQuery}
      debouncedPopoverSearch={debouncedPopoverSearch}
      options={options}
      showEmptyQueryHint={showEmptyQueryHint}
      triggerSummary={triggerSummary}
      triggerId={triggerId}
      setOpen={setOpen}
      setPopoverSearch={setPopoverSearch}
    />
  )
}
