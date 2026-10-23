import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import type { AdminEntityColumn } from "../../admin-entity-types"

type MergedOpts = {
  relationFilterSelections?: Record<string, string>
  listBooleanFilter?: { param: string; value: boolean }
  allowEmptySearchFetch?: boolean
}

export function buildMergedRelatedListSearchOpts(
  usingPreloadedOptions: boolean,
  relationFilterSelections: Record<string, string> | undefined,
  listBooleanFilter: { param: string; value: boolean } | undefined,
  allowEmptySearchFetch: boolean | undefined,
): MergedOpts | undefined {
  if (usingPreloadedOptions) return undefined
  const out: MergedOpts = {}
  if (relationFilterSelections != null) out.relationFilterSelections = relationFilterSelections
  if (listBooleanFilter != null) out.listBooleanFilter = listBooleanFilter
  if (allowEmptySearchFetch === true) out.allowEmptySearchFetch = true
  return Object.keys(out).length > 0 ? out : undefined
}

export function buildRelationSearchOptions(
  usingPreloadedOptions: boolean,
  preloadedOptions: readonly { value: string; label: string }[] | undefined,
  listQueryItems: Record<string, unknown>[],
  idKey: string,
  excludeIdSet: Set<string>,
  labelColumnKeys: readonly string[],
  relatedColumns: readonly AdminEntityColumn[] | undefined,
  compoundIdAndLabel: boolean,
): { value: string; label: string }[] {
  if (usingPreloadedOptions) {
    return preloadedOptions as { value: string; label: string }[]
  }
  return listQueryItems
    .map((row) => {
      const id = row[idKey]
      if (id == null) return null
      const v = String(id)
      if (excludeIdSet.has(v)) return null
      const label = adminEntityRelationOptionLabel(row, labelColumnKeys, relatedColumns)
      const namePart = label.trim() !== "" ? label.trim() : v
      const displayLabel = compoundIdAndLabel ? `${v} - ${namePart}` : namePart
      return { value: v, label: displayLabel }
    })
    .filter((x): x is { value: string; label: string } => x != null)
}

export function buildRelationTriggerSummary(opts: {
  trimmed: string
  emptyChoiceLabel: string
  compoundIdAndLabel: boolean
  isPreloaded: boolean
  selectedLabelIsPending: boolean
  labelFromInlineEmbed: string
  effectiveRelationLabel: string
  value: string
  resolvedName: string
}): string {
  const {
    trimmed,
    emptyChoiceLabel,
    compoundIdAndLabel,
    isPreloaded,
    selectedLabelIsPending,
    labelFromInlineEmbed,
    effectiveRelationLabel,
    value,
    resolvedName,
  } = opts
  if (trimmed === "") return emptyChoiceLabel
  if (!compoundIdAndLabel) {
    const hasEmbedLabel = labelFromInlineEmbed !== ""
    if (!isPreloaded && selectedLabelIsPending && !hasEmbedLabel) return "…"
    return effectiveRelationLabel !== "" ? effectiveRelationLabel : value
  }
  if (!isPreloaded && selectedLabelIsPending && labelFromInlineEmbed === "") {
    return `${trimmed} - …`
  }
  const namePart = labelFromInlineEmbed !== "" ? labelFromInlineEmbed : resolvedName
  if (namePart === "" || namePart === trimmed) return trimmed
  return `${trimmed} - ${namePart}`
}
