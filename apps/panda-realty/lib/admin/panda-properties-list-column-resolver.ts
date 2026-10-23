import type {
  AdminResolveListQuickDesktopCardsActive,
  AdminResolveListTableColumnKeys,
} from "@repo/admin/admin-client-registry-context"
import {
  PANDA_PROPERTIES_FAVORITES_TABLE_COLUMN_KEYS,
  PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS,
  propertiesQuickTableFiltersActive,
} from "@/lib/admin/properties-quick-table-filters"
import {
  PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS,
  streetFilterSegmentActive,
} from "@/lib/admin/properties-map-results-view"

export const PROPERTY_FORMS_QUICK_COLUMN_KEYS = [
  "formName",
  "category",
  "isActive",
  "fileLink",
  "fileName",
] as const

export const resolvePropertiesListTableColumnKeys: AdminResolveListTableColumnKeys = (
  args,
) => {
  if (args.isCompactListViewport || args.listLayoutMode !== "table") return undefined

  if (args.slug === "property-forms") {
    return PROPERTY_FORMS_QUICK_COLUMN_KEYS
  }

  if (args.slug !== "properties") return undefined

  // Map-area results: a normal one-line comparable table with no Status column. Checked before the
  // favourites/quick logic so it does not depend on the favourites segment or a stray status pick.
  if (streetFilterSegmentActive(args.listAppendWhereHintSegments["streetFilter"])) {
    return PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS
  }

  if (args.listBooleanFilterSegment !== "true") return undefined
  if (
    (args.relationFilterSelections["propertyStatusId"] ?? "").trim() === "" &&
    propertiesQuickTableFiltersActive({
      listAppendWhereHintSegments: args.listAppendWhereHintSegments,
      listSearchDebounced: args.listSearchDebounced,
      relationFilterSelections: args.relationFilterSelections,
    })
  ) {
    return PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS
  }
  return PANDA_PROPERTIES_FAVORITES_TABLE_COLUMN_KEYS
}

export const resolvePropertiesListQuickDesktopCardsActive: AdminResolveListQuickDesktopCardsActive =
  (args) => {
    if (args.slug !== "properties") return false
    if (args.isCompactListViewport || args.listLayoutMode !== "table") return false
    if (args.listBooleanFilterSegment !== "true") return false
    if ((args.relationFilterSelections["propertyStatusId"] ?? "").trim() !== "") return false
    // Map-area search is for scanning comparables, so it shows the compact table list rather than the
    // stacked card panel — the quick TABLE columns still apply (resolvePropertiesListTableColumnKeys),
    // only the card layout is suppressed. The favourites view (no map filter) keeps the cards.
    if ((args.listAppendWhereHintSegments["streetFilter"] ?? "").trim() !== "") return false
    return propertiesQuickTableFiltersActive({
      listAppendWhereHintSegments: args.listAppendWhereHintSegments,
      listSearchDebounced: args.listSearchDebounced,
      relationFilterSelections: args.relationFilterSelections,
    })
  }
