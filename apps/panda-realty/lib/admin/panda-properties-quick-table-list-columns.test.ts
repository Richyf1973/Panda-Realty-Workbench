import { describe, expect, it } from "vitest"

import { adminEntityListColumnsByKeys } from "@repo/admin/admin-entity-list-columns-by-keys"
import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"

import { pandaPropertiesEntity } from "./entities/pandaProperties"
import {
  isPandaPropertiesQuickTableColumnSet,
  transformPandaPropertiesQuickTableListColumns,
} from "./panda-properties-quick-table-list-columns"
import { PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS } from "./properties-map-results-view"

const cfg = pandaPropertiesEntity as unknown as AdminEntityDefinition

function transformArgs(columns: ReturnType<typeof adminEntityListColumnsByKeys>) {
  return {
    slug: "properties" as const,
    cfg,
    columns,
    listAppendWhereHintSegments: {},
    listSearchDebounced: "",
    relationFilterSelections: {},
    listLayoutMode: "table" as const,
    isCompactListViewport: false,
    listBooleanFilterSegment: "true" as const,
  }
}

describe("transformPandaPropertiesQuickTableListColumns", () => {
  it("returns undefined when column set is not the quick table", () => {
    const cols = adminEntityListColumnsByKeys(cfg, ["streetAddress", "suburb"])
    expect(
      transformPandaPropertiesQuickTableListColumns({
        slug: "properties",
        cfg,
        columns: cols,
        listAppendWhereHintSegments: {},
        listSearchDebounced: "",
        relationFilterSelections: {},
        listLayoutMode: "table",
        isCompactListViewport: false,
        listBooleanFilterSegment: "true" as const,
      }),
    ).toBeUndefined()
  })

  it("shortens labels and sets width hints for quick columns", () => {
    const keys = [
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
    const cols = adminEntityListColumnsByKeys(cfg, keys)
    expect(isPandaPropertiesQuickTableColumnSet(cols)).toBe(true)
    const next = transformPandaPropertiesQuickTableListColumns({
      slug: "properties",
      cfg,
      columns: cols,
      listAppendWhereHintSegments: {},
      listSearchDebounced: "x",
      relationFilterSelections: {},
      listLayoutMode: "table",
      isCompactListViewport: false,
      listBooleanFilterSegment: "true" as const,
    })
    expect(next).toBeDefined()
    const byKey = new Map(next!.map((c) => [c.key, c]))
    expect(byKey.get("bed")?.label).toBe("B")
    expect(byKey.get("bed")?.listColumnMaxWidthPx).toBe(52)
    expect(byKey.get("saleDate")?.label).toBe("Sold")
    expect(byKey.get("saleDate")?.listColumnMinWidthPx).toBe(112)
    expect(byKey.get("streetAddress")?.listColumnWrapMaxWidthPx).toBe(160)
    expect(byKey.get("streetAddress")?.listColumnWrapMaxLines).toBe(2)
  })

  it("quick branch does NOT add the hide-historical flag (scope guard for the map view only)", () => {
    const keys = [
      "propertyStatusId", "streetAddress", "suburb", "combinedOwner", "bed", "bath", "car",
      "buildingArea", "landSize", "salePrice", "saleDate", "appraisedAmount", "contractDate",
      "contractPrice", "completionDate", "successfulBuyer",
    ] as const
    const cols = adminEntityListColumnsByKeys(cfg, keys)
    const next = transformPandaPropertiesQuickTableListColumns(transformArgs(cols))
    const byKey = new Map(next!.map((c) => [c.key, c]))
    expect(byKey.get("salePrice")?.listCellHideWhenSiblingPresentKeys).toBeUndefined()
    expect(byKey.get("saleDate")?.listCellHideWhenSiblingPresentKeys).toBeUndefined()
  })
})

describe("transformPandaPropertiesQuickTableListColumns — map results branch", () => {
  it("blanks historical sale price/date when a contract or appraised price exists, without quick density", () => {
    const cols = adminEntityListColumnsByKeys(cfg, [...PANDA_PROPERTIES_MAP_TABLE_COLUMN_KEYS])
    const next = transformPandaPropertiesQuickTableListColumns(transformArgs(cols))
    expect(next).toBeDefined()
    const byKey = new Map(next!.map((c) => [c.key, c]))
    // salePrice + saleDate carry the hide-when-sibling-present flag for the two preferred figures.
    expect(byKey.get("salePrice")?.listCellHideWhenSiblingPresentKeys).toEqual([
      "contractPrice",
      "appraisedAmount",
    ])
    expect(byKey.get("saleDate")?.listCellHideWhenSiblingPresentKeys).toEqual([
      "contractPrice",
      "appraisedAmount",
    ])
    // The map view keeps the default one-line widths/labels — the quick density hints must NOT apply.
    expect(byKey.get("salePrice")?.label).toBe("Last sale price")
    expect(byKey.get("saleDate")?.label).toBe("Last sale date")
    expect(byKey.get("suburb")?.listColumnWrapMaxLines).toBeUndefined()
  })
})
