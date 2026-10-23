import { describe, expect, it, vi } from "vitest"

import { resolveAdminEntityListColsForTable } from "./use-admin-entity-admin-list-cols"
import type { AdminEntityDefinition } from "../../admin-entity-types"

const cfg = {
  slug: "demo",
  columns: [
    {
      key: "a",
      sqlName: "a",
      label: "A",
      valueType: "text" as const,
      list: true,
      create: false,
      patch: false,
      sortable: false,
    },
    {
      key: "b",
      sqlName: "b",
      label: "B",
      valueType: "text" as const,
      list: true,
      create: false,
      patch: false,
      sortable: false,
    },
  ],
  listColumnOrder: ["a", "b"] as const,
} as unknown as AdminEntityDefinition

const baseArgs = {
  slug: "demo" as const,
  cfg,
  listAppendWhereHintSegments: {},
  listSearchForRequest: "",
  relationFilterSelections: {},
  listLayoutMode: "table" as const,
  isCompactListViewport: false,
}

describe("resolveAdminEntityListColsForTable", () => {
  it("uses listColumnOrder when resolver returns undefined", () => {
    const cols = resolveAdminEntityListColsForTable({
      ...baseArgs,
      resolveListTableColumnKeys: () => undefined,
    })
    expect(cols.map((c) => c.key)).toEqual(["a", "b"])
  })

  it("uses resolver keys when non-empty", () => {
    const cols = resolveAdminEntityListColsForTable({
      ...baseArgs,
      resolveListTableColumnKeys: () => ["b", "a"],
    })
    expect(cols.map((c) => c.key)).toEqual(["b", "a"])
  })

  it("ignores empty resolver array", () => {
    const spy = vi.fn(() => [] as readonly string[])
    const cols = resolveAdminEntityListColsForTable({
      ...baseArgs,
      resolveListTableColumnKeys: spy,
    })
    expect(spy).toHaveBeenCalled()
    expect(cols.map((c) => c.key)).toEqual(["a", "b"])
  })

  it("applies transformListTableColumns when provided", () => {
    const cols = resolveAdminEntityListColsForTable({
      ...baseArgs,
      resolveListTableColumnKeys: () => ["b", "a"],
      transformListTableColumns: ({ columns }) =>
        columns.map((c) =>
          c.key === "a" ? { ...c, label: "A-prime" } : c,
        ),
    })
    expect(cols.map((c) => c.key)).toEqual(["b", "a"])
    expect(cols.find((c) => c.key === "a")?.label).toBe("A-prime")
  })
})
