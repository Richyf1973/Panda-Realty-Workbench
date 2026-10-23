import { describe, expect, it } from "vitest"

import {
  parseAdminEntityListDateRangeFilterFromCfg,
  parseAdminEntityListDateRangeFiltersFromCfg,
} from "./admin-entity-list-date-range-filter-parse"
import type { AdminEntityDefinition } from "./admin-entity-types"

const baseCfg = {
  adminPage: true,
  slug: "sales",
  schemaSqlName: "vibram_sales.sales",
  apiBase: "/api/admin/sales",
  queryKey: ["admin", "sales"],
  nav: { label: "Sales" },
  metadataTitle: "Sales",
  idColumn: { jsonKey: "drNumber", valueType: "text" },
  deleteLabelColumnKey: "drNumber",
  columns: [],
  listOrderBy: [{ columnKey: "salesDate", direction: "desc" }],
  ui: {
    title: "Sales",
    singular: "sale",
    addCardTitle: "Add",
    listTitle: "Sales",
    loadErrorLabel: "err",
    emptyLabel: "empty",
  },
} as const satisfies AdminEntityDefinition

const cfgWithRange = {
  ...baseCfg,
  listDateRangeFilter: {
    columnKey: "salesDate",
    fromQueryParam: "salesDateFrom",
    toQueryParam: "salesDateTo",
  },
} as const satisfies AdminEntityDefinition

describe("parseAdminEntityListDateRangeFilterFromCfg", () => {
  it("returns empty when spec missing", () => {
    const qs = new URLSearchParams()
    qs.set("salesDateFrom", "2025-01-01")
    qs.set("salesDateTo", "2025-01-31")
    expect(parseAdminEntityListDateRangeFilterFromCfg(baseCfg, qs)).toEqual({
      from: "",
      to: "",
    })
  })

  it("returns empty when either param missing", () => {
    const qs = new URLSearchParams()
    qs.set("salesDateFrom", "2025-01-01")
    expect(parseAdminEntityListDateRangeFilterFromCfg(cfgWithRange, qs)).toEqual(
      { from: "", to: "" },
    )
  })

  it("returns empty for invalid dates", () => {
    const qs = new URLSearchParams()
    qs.set("salesDateFrom", "2025-02-30")
    qs.set("salesDateTo", "2025-01-31")
    expect(parseAdminEntityListDateRangeFilterFromCfg(cfgWithRange, qs)).toEqual(
      { from: "", to: "" },
    )
  })

  it("parses valid inclusive range", () => {
    const qs = new URLSearchParams()
    qs.set("salesDateFrom", "2025-01-01")
    qs.set("salesDateTo", "2025-01-31")
    expect(parseAdminEntityListDateRangeFilterFromCfg(cfgWithRange, qs)).toEqual({
      from: "2025-01-01",
      to: "2025-01-31",
    })
  })

  it("swaps when from > to", () => {
    const qs = new URLSearchParams()
    qs.set("salesDateFrom", "2025-02-01")
    qs.set("salesDateTo", "2025-01-01")
    expect(parseAdminEntityListDateRangeFilterFromCfg(cfgWithRange, qs)).toEqual({
      from: "2025-01-01",
      to: "2025-02-01",
    })
  })
})

const cfgMultiRange = {
  ...baseCfg,
  slug: "multi",
  listDateRangeFilters: [
    {
      columnKey: "a",
      fromQueryParam: "aFrom",
      toQueryParam: "aTo",
    },
    {
      columnKey: "b",
      fromQueryParam: "bFrom",
      toQueryParam: "bTo",
    },
  ],
} as const satisfies AdminEntityDefinition

describe("parseAdminEntityListDateRangeFiltersFromCfg", () => {
  it("parses multiple independent ranges", () => {
    const qs = new URLSearchParams()
    qs.set("aFrom", "2025-01-10")
    qs.set("aTo", "2025-01-12")
    qs.set("bFrom", "2025-03-01")
    qs.set("bTo", "2025-03-31")
    expect(parseAdminEntityListDateRangeFiltersFromCfg(cfgMultiRange, qs)).toEqual([
      { columnKey: "a", from: "2025-01-10", to: "2025-01-12" },
      { columnKey: "b", from: "2025-03-01", to: "2025-03-31" },
    ])
  })

  it("omits incomplete ranges", () => {
    const qs = new URLSearchParams()
    qs.set("aFrom", "2025-01-10")
    qs.set("aTo", "2025-01-12")
    qs.set("bFrom", "2025-03-01")
    expect(parseAdminEntityListDateRangeFiltersFromCfg(cfgMultiRange, qs)).toEqual([
      { columnKey: "a", from: "2025-01-10", to: "2025-01-12" },
    ])
  })
})
