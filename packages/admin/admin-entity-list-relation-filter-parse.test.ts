import { describe, expect, it } from "vitest"

import { parseAdminEntityRelationListFiltersFromCfg } from "./admin-entity-list-relation-filter-parse"
import type { AdminEntityDefinition } from "./admin-entity-types"

/** Minimal cfg: parse only needs `columns` + `listRelationFilters`. */
const textFkCfg = {
  columns: [
    {
      key: "supplierCode",
      sqlName: "supplier_code",
      label: "Supplier",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: true,
      listRelation: {
        relatedEntitySlug: "suppliers",
        embedJsonKey: "supplier",
        labelColumnKeys: ["supplierName"] as const,
      },
    },
  ],
  listRelationFilters: [{ columnKey: "supplierCode" }] as const,
} as unknown as AdminEntityDefinition

describe("parseAdminEntityRelationListFiltersFromCfg (text FK)", () => {
  it("parses single text code from query param", () => {
    const sp = new URLSearchParams()
    sp.set("supplierCode", "  ACME  ")
    const { api, selections } = parseAdminEntityRelationListFiltersFromCfg(
      textFkCfg,
      sp,
    )
    expect(selections.supplierCode).toBe("ACME")
    expect(api.supplierCode).toBe("ACME")
  })

  it("dedupes and sorts multiple text values when multiSelect", () => {
    const multiCfg = {
      ...textFkCfg,
      listRelationFilters: [
        { columnKey: "supplierCode", multiSelect: true },
      ] as const,
    } as unknown as AdminEntityDefinition
    const sp = new URLSearchParams()
    sp.append("supplierCode", "B")
    sp.append("supplierCode", "A")
    sp.append("supplierCode", "B")
    const { api, selections } = parseAdminEntityRelationListFiltersFromCfg(
      multiCfg,
      sp,
    )
    expect(selections.supplierCode).toBe("A,B")
    expect(api.supplierCode).toEqual(["A", "B"])
  })
})
