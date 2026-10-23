import { describe, expect, it } from "vitest"

import type { AdminEntityDefinition } from "./admin-entity-types"
import { formatRelationFilterAsyncSearchFieldsHint } from "./admin-entity-relation-filter-async-search-hint"

describe("formatRelationFilterAsyncSearchFieldsHint", () => {
  it("joins multiple labels with Oxford-style and", () => {
    const cfg = {
      columns: [
        { key: "a", label: "Alpha" },
        { key: "b", label: "Beta" },
        { key: "c", label: "Gamma" },
      ],
      listSearch: { columnKeys: ["a", "b", "c"] },
    } as unknown as AdminEntityDefinition
    expect(formatRelationFilterAsyncSearchFieldsHint(cfg)).toBe(
      "Alpha, Beta, and Gamma",
    )
  })

  it("returns undefined when no listSearch", () => {
    const cfg = { columns: [], listSearch: undefined } as unknown as AdminEntityDefinition
    expect(formatRelationFilterAsyncSearchFieldsHint(cfg)).toBeUndefined()
  })
})
