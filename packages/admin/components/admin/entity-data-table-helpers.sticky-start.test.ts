import { describe, expect, it } from "vitest"

import {
  computeStickyStartPlan,
  ROW_LINKS_COLUMN_ID,
  STICKY_START_FALLBACK_WIDTH_PX,
  type EntityTableColumnMeta,
} from "./entity-data-table-helpers"

type Leaf = { id: string; meta: EntityTableColumnMeta | undefined }

function leaf(id: string, width?: number): Leaf {
  return {
    id,
    meta:
      width != null
        ? { listColumnMinWidthPx: width, listColumnMaxWidthPx: width }
        : undefined,
  }
}

const PROPERTIES_LEAVES: Leaf[] = [
  leaf(ROW_LINKS_COLUMN_ID),
  leaf("propertyStatusId", 112),
  leaf("streetAddress", 220),
  leaf("suburb", 0),
  leaf("combinedOwner"),
  { id: "actions", meta: undefined },
]

describe("computeStickyStartPlan", () => {
  it("returns null when no sticky start key is configured", () => {
    expect(
      computeStickyStartPlan({
        orderedLeaf: PROPERTIES_LEAVES,
        stickyStartColumnKey: undefined,
        rowLinksWidthPx: 116,
      }),
    ).toBeNull()
  })

  it("returns null when the key is not among the leaf columns", () => {
    expect(
      computeStickyStartPlan({
        orderedLeaf: PROPERTIES_LEAVES,
        stickyStartColumnKey: "doesNotExist",
        rowLinksWidthPx: 116,
      }),
    ).toBeNull()
  })

  it("accumulates ascending left offsets for row-links + Status + Street", () => {
    const plan = computeStickyStartPlan({
      orderedLeaf: PROPERTIES_LEAVES,
      stickyStartColumnKey: "streetAddress",
      rowLinksWidthPx: 116,
    })
    expect(plan).not.toBeNull()
    // Only the frozen band is in the plan; scrolling columns are absent.
    expect([...plan!.keys()]).toEqual([
      ROW_LINKS_COLUMN_ID,
      "propertyStatusId",
      "streetAddress",
    ])
    expect(plan!.get(ROW_LINKS_COLUMN_ID)).toEqual({
      left: 0,
      width: 116,
      isSeam: false,
    })
    expect(plan!.get("propertyStatusId")).toEqual({
      left: 116,
      width: 112,
      isSeam: false,
    })
    // Street is the last frozen column → seam; left = 116 + 112.
    expect(plan!.get("streetAddress")).toEqual({
      left: 228,
      width: 220,
      isSeam: true,
    })
  })

  it("does not include the first scrolling column (suburb)", () => {
    const plan = computeStickyStartPlan({
      orderedLeaf: PROPERTIES_LEAVES,
      stickyStartColumnKey: "streetAddress",
      rowLinksWidthPx: 116,
    })
    expect(plan!.has("suburb")).toBe(false)
    expect(plan!.has("actions")).toBe(false)
  })

  it("falls back to the default width when a frozen column has no fixed width", () => {
    const leaves: Leaf[] = [leaf(ROW_LINKS_COLUMN_ID), leaf("streetAddress")]
    const plan = computeStickyStartPlan({
      orderedLeaf: leaves,
      stickyStartColumnKey: "streetAddress",
      rowLinksWidthPx: undefined,
    })
    expect(plan!.get(ROW_LINKS_COLUMN_ID)).toEqual({
      left: 0,
      width: STICKY_START_FALLBACK_WIDTH_PX,
      isSeam: false,
    })
    expect(plan!.get("streetAddress")).toEqual({
      left: STICKY_START_FALLBACK_WIDTH_PX,
      width: STICKY_START_FALLBACK_WIDTH_PX,
      isSeam: true,
    })
  })
})
