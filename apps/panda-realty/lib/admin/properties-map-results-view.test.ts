import { describe, expect, it } from "vitest"

import type { AdminResolveListTableColumnKeysArgs } from "@repo/admin/admin-client-registry-context"

import { resolvePropertiesListTableColumnKeys } from "./panda-properties-list-column-resolver"
import {
  PANDA_PROPERTIES_FAVORITES_TABLE_COLUMN_KEYS,
  PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS,
} from "./properties-quick-table-filters"
import { adminEntityListColumnsByKeys } from "@repo/admin/admin-entity-list-columns-by-keys"
import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"

import { pandaPropertiesEntity } from "./entities/pandaProperties"
import {
  isPandaPropertiesMapTableColumnSet,
  PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS,
  streetFilterSegmentActive,
} from "./properties-map-results-view"

describe("streetFilterSegmentActive", () => {
  it("is true only for a non-empty trimmed value", () => {
    expect(streetFilterSegmentActive("Hollywood Avenue~QLD")).toBe(true)
    expect(streetFilterSegmentActive("   x   ")).toBe(true)
    expect(streetFilterSegmentActive("")).toBe(false)
    expect(streetFilterSegmentActive("   ")).toBe(false)
    expect(streetFilterSegmentActive(null)).toBe(false)
    expect(streetFilterSegmentActive(undefined)).toBe(false)
  })
})

describe("PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS", () => {
  it("is the quick comparison set without the Status column", () => {
    expect(PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS).not.toContain("propertyStatusId")
    expect(PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS).toEqual(
      PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS.filter((k) => k !== "propertyStatusId"),
    )
    // Comparable columns Richard scans are retained.
    for (const key of ["streetAddress", "suburb", "combinedOwner", "bed", "bath", "car", "salePrice", "saleDate"]) {
      expect(PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS).toContain(key)
    }
  })

  it("does NOT exactly match the quick set, so the compact transform is skipped", () => {
    expect(PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS.length).not.toBe(
      PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS.length,
    )
  })
})

describe("isPandaPropertiesMapTableColumnSet", () => {
  const cfg = pandaPropertiesEntity as unknown as AdminEntityDefinition

  it("is true for exactly the map column set in order", () => {
    const cols = adminEntityListColumnsByKeys(cfg, [...PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS])
    expect(isPandaPropertiesMapTableColumnSet(cols)).toBe(true)
  })

  it("is false for the quick set (which still has the Status column)", () => {
    const cols = adminEntityListColumnsByKeys(cfg, [...PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS])
    expect(isPandaPropertiesMapTableColumnSet(cols)).toBe(false)
  })

  it("is false for an arbitrary subset", () => {
    const cols = adminEntityListColumnsByKeys(cfg, ["streetAddress", "suburb"])
    expect(isPandaPropertiesMapTableColumnSet(cols)).toBe(false)
  })
})

function args(
  overrides: Partial<AdminResolveListTableColumnKeysArgs>,
): AdminResolveListTableColumnKeysArgs {
  return {
    slug: "properties",
    listLayoutMode: "table",
    isCompactListViewport: false,
    listBooleanFilterSegment: "true",
    listSearchDebounced: "",
    relationFilterSelections: {},
    listAppendWhereHintSegments: {},
    // cfg is unused by the resolver; cast keeps the test light.
    ...overrides,
  } as AdminResolveListTableColumnKeysArgs
}

describe("resolvePropertiesListTableColumnKeys — map results", () => {
  it("returns the map set (no Status) when the map filter is active", () => {
    const result = resolvePropertiesListTableColumnKeys(
      args({ listAppendWhereHintSegments: { streetFilter: "Hollywood Avenue~QLD" } }),
    )
    expect(result).toEqual(PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS)
    expect(result).not.toContain("propertyStatusId")
  })

  it("takes precedence over the favourites segment and a stray status selection", () => {
    const result = resolvePropertiesListTableColumnKeys(
      args({
        listBooleanFilterSegment: "all",
        relationFilterSelections: { propertyStatusId: "1" },
        listAppendWhereHintSegments: { streetFilter: "Hollywood Avenue~QLD" },
      }),
    )
    expect(result).toEqual(PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS)
  })

  it("still returns the quick comparison set for a non-map narrowing filter (search)", () => {
    const result = resolvePropertiesListTableColumnKeys(args({ listSearchDebounced: "smith" }))
    expect(result).toEqual(PANDA_PROPERTIES_QUICK_TABLE_COLUMN_KEYS)
  })

  it("returns the favourites columns when only the favourites segment is on (no narrowing)", () => {
    const result = resolvePropertiesListTableColumnKeys(args({}))
    expect(result).toEqual(PANDA_PROPERTIES_FAVORITES_TABLE_COLUMN_KEYS)
  })

  it("returns undefined for the compact / mobile viewport", () => {
    const result = resolvePropertiesListTableColumnKeys(
      args({
        isCompactListViewport: true,
        listAppendWhereHintSegments: { streetFilter: "Hollywood Avenue~QLD" },
      }),
    )
    expect(result).toBeUndefined()
  })
})
