/**
 * Panda properties admin: "quick" desktop table columns when map / manual filters / search /
 * status narrow the list — **not** when only the Favorites boolean is active.
 */

export const PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS = [
  "propertyStatusId",
  "streetAddress",
  "suburb",
  "combinedOwner",
  "bed",
  "bath",
  "car",
  "buildingArea",
  "landSize",
  "salePrice",
  "saleDate",
  "appraisedAmount",
  "contractDate",
  "contractPrice",
  "completionDate",
  "successfulBuyer",
] as const

export const PANDA_PROPERTIES_FAVORITES_TABLE_COLUMN_KEYS = [
  "propertyStatusId",
  "streetAddress",
  "suburb",
  "combinedOwner",
  "appraisedAmount",
  "contractDate",
  "contractPrice",
  "commissionAmount",
  "coolingOffDate",
  "buildingPestDate",
  "financeDate",
  "dueDiligenceDate",
  "saleOfPropertyDate",
  "unconditionalContractDate",
  "completionDate",
  "isCashOffer",
  "noConditions",
  "isSubjectToSale",
  "otherConditions",
] as const

export type PropertiesQuickTableFiltersInput = {
  readonly listAppendWhereHintSegments: Readonly<Record<string, string>>
  /** Debounced list search (same string the list GET uses). */
  readonly listSearchDebounced: string
  readonly relationFilterSelections: Readonly<Record<string, string>>
}

function appendWhereHintsActive(
  segments: Readonly<Record<string, string>>,
): boolean {
  for (const v of Object.values(segments)) {
    if ((v ?? "").trim() !== "") return true
  }
  return false
}

/**
 * @returns true when any non–favorites-boolean narrowing is active (append-where hints or search).
 * Status relation selection intentionally excluded — it suppresses quick card mode instead.
 */
export function propertiesQuickTableFiltersActive(
  input: PropertiesQuickTableFiltersInput,
): boolean {
  if (appendWhereHintsActive(input.listAppendWhereHintSegments)) return true
  if (input.listSearchDebounced.trim() !== "") return true
  return false
}
