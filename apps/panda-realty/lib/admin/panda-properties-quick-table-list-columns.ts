import type { AdminTransformListTableColumnsArgs } from "@repo/admin/admin-client-registry-context"
import type { AdminEntityColumn } from "@repo/admin/admin-entity-types"

import { PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS } from "./properties-quick-table-filters"
import { isPandaPropertiesMapTableColumnSet } from "./properties-map-results-view"

/**
 * Map-results view: blank a property's historical Last sale price / date once it has either of these
 * preferred figures, so the comparison reads off the contract or appraised price instead.
 */
const MAP_HISTORICAL_SALE_HIDE_SIBLINGS = ["contractPrice", "appraisedAmount"] as const

export function isPandaPropertiesQuickTableColumnSet(
  cols: readonly AdminEntityColumn[],
): boolean {
  if (cols.length !== PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS.length) return false
  return PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS.every((k, i) => cols[i]?.key === k)
}

/**
 * Density + width hints for the Properties **quick** desktop table only.
 * Returns `undefined` when not in that mode so {@link resolveAdminEntityListColsForTable} keeps defaults.
 */
export function transformPandaPropertiesQuickTableListColumns(
  args: AdminTransformListTableColumnsArgs,
): AdminEntityColumn[] | undefined {
  if (args.slug !== "properties") return undefined

  // Map-results view: keep the default one-line widths/labels (do NOT apply the quick density), but
  // blank each row's historical sale price/date when a contract or appraised price is present.
  if (isPandaPropertiesMapTableColumnSet(args.columns)) {
    return args.columns.map((col) =>
      col.key === "salePrice" || col.key === "saleDate"
        ? { ...col, listCellHideWhenSiblingPresentKeys: MAP_HISTORICAL_SALE_HIDE_SIBLINGS }
        : col,
    )
  }

  if (!isPandaPropertiesQuickTableColumnSet(args.columns)) return undefined

  return args.columns.map((col) => {
    switch (col.key) {
      case "propertyStatusId":
        return { ...col, label: "Sts" }
      case "streetAddress":
        return {
          ...col,
          label: "Street",
          listColumnWrapMaxWidthPx: 160,
          listColumnWrapMaxLines: 2,
        }
      case "suburb":
        return {
          ...col,
          label: "Sub",
          listColumnWrapMaxWidthPx: 120,
          listColumnWrapMaxLines: 2,
        }
      case "bed":
        return { ...col, label: "B", listColumnMaxWidthPx: 52 }
      case "bath":
        return { ...col, label: "Bt", listColumnMaxWidthPx: 52 }
      case "car":
        return { ...col, label: "C", listColumnMaxWidthPx: 52 }
      case "buildingArea":
        return { ...col, label: "Bld", listColumnMaxWidthPx: 72 }
      case "landSize":
        return { ...col, label: "Land Size" }
      case "salePrice":
        return { ...col, label: "Price", listColumnMinWidthPx: 92 }
      case "saleDate":
        return {
          ...col,
          label: "Sold",
          listColumnMinWidthPx: 112,
        }
      case "appraisedAmount":
      case "contractDate":
      case "contractPrice":
      case "completionDate":
      case "successfulBuyer":
        return col
      default:
        return col
    }
  })
}
