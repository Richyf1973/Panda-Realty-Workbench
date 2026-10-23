import { describe, expect, it } from "vitest"

import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"
import {
  formatAdminEntityVirtualRelationLabelValue,
  resolveRelatedColumnForVirtualRelationLabel,
} from "./admin-entity-list-virtual-relation-label-format"

function miniSalesEntity(): AdminEntityDefinition {
  return {
    adminPage: true as const,
    slug: "sales",
    schemaSqlName: "x.sales",
    apiBase: "/api/admin/sales",
    queryKey: ["admin", "sales"],
    nav: { label: "Sales" },
    metadataTitle: "Sales",
    idColumn: { jsonKey: "drNumber", valueType: "text" },
    deleteLabelColumnKey: "drNumber",
    columns: [
      {
        key: "drNumber",
        sqlName: "dr_number",
        label: "DR",
        valueType: "text",
        list: true,
        create: true,
        patch: false,
        sortable: true,
      },
      {
        key: "salesDate",
        sqlName: "sales_date",
        label: "Sales date",
        valueType: "text",
        list: true,
        create: true,
        patch: true,
        sortable: true,
        dateStringFormControl: "calendar",
      },
    ],
    listOrderBy: [{ columnKey: "drNumber", direction: "asc" }],
    ui: {
      title: "Sales",
      singular: "sale",
      addCardTitle: "Add",
      listTitle: "Sales",
      loadErrorLabel: "x",
      emptyLabel: "y",
    },
  } as unknown as AdminEntityDefinition
}

const itemizedListCols = [
  {
    key: "drNumber",
    sqlName: "dr_number",
    label: "DR",
    valueType: "text",
    list: true,
    create: false,
    patch: false,
    sortable: true,
    listRelation: {
      relatedEntitySlug: "sales",
      embedJsonKey: "sale",
      labelColumnKeys: ["drNumber"] as const,
      listCellShow: "storedFk" as const,
    },
  },
  {
    key: "lineSalesDate",
    sqlName: "x",
    label: "Sales date",
    valueType: "text",
    list: true,
    listVirtual: true,
    listVirtualRelationLabel: {
      sourceColumnKey: "drNumber",
      labelColumnKeys: ["salesDate"] as const,
    },
    create: false,
    patch: false,
    sortable: false,
  },
] as const satisfies readonly AdminEntityColumn[]

describe("admin-entity-list-virtual-relation-label-format", () => {
  it("resolves related column for virtual label keys", () => {
    const entities = { sales: miniSalesEntity() }
    const col = resolveRelatedColumnForVirtualRelationLabel(
      itemizedListCols,
      entities,
      "drNumber",
      "salesDate",
    )
    expect(col?.key).toBe("salesDate")
    expect(col?.dateStringFormControl).toBe("calendar")
  })

  it("formats embedded YYYY-MM-DD like the sales list (Mar 16, 2026)", () => {
    const entities = { sales: miniSalesEntity() }
    const relatedCol = resolveRelatedColumnForVirtualRelationLabel(
      itemizedListCols,
      entities,
      "drNumber",
      "salesDate",
    )
    expect(
      formatAdminEntityVirtualRelationLabelValue("2026-03-16", relatedCol),
    ).toBe("Mar 16, 2026")
  })

  it("falls back to cellString without related column metadata", () => {
    expect(
      formatAdminEntityVirtualRelationLabelValue("2026-03-16", undefined),
    ).toBe("2026-03-16")
  })
})
