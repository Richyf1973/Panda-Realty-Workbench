import { describe, expect, it } from "vitest"

import { adminEntityListMobileCardFields } from "./admin-entity-list-mobile-card-fields"
import type { AdminEntityDefinition } from "./admin-entity-types"

const base = {
  adminPage: true,
  slug: "test-entity",
  schemaSqlName: "public.test",
  apiBase: "/api/admin/test-entity",
  queryKey: ["admin", "test-entity"] as const,
  nav: { label: "Test" },
  metadataTitle: "Test",
  idColumn: { jsonKey: "id" as const, valueType: "integer" as const },
  deleteLabelColumnKey: "name",
  listOrderBy: [{ columnKey: "id", direction: "asc" }] as const,
  ui: {
    title: "Test",
    singular: "row",
    addCardTitle: "Add",
    listTitle: "All",
    loadErrorLabel: "Error",
    emptyLabel: "Empty",
  },
  columns: [
    {
      key: "id",
      sqlName: "id",
      label: "ID",
      valueType: "integer" as const,
      list: true,
      create: false,
      patch: false,
      sortable: true,
    },
    {
      key: "name",
      sqlName: "name",
      label: "Name",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: true,
    },
    {
      key: "amount",
      sqlName: "amount",
      label: "Amount",
      valueType: "numeric" as const,
      list: true,
      create: false,
      patch: false,
      sortable: false,
      currencySymbol: "₱",
    },
    {
      key: "hidden",
      sqlName: "hidden",
      label: "Hidden",
      valueType: "text" as const,
      list: false,
      create: false,
      patch: false,
      sortable: false,
    },
  ],
} as const satisfies AdminEntityDefinition

describe("adminEntityListMobileCardFields", () => {
  it("defaults to first six list columns in list order", () => {
    const r = adminEntityListMobileCardFields(base as AdminEntityDefinition)
    expect(r.fields.map((f) => f.columnKey)).toEqual(["id", "name", "amount"])
    expect(r.titleColumnKey).toBe("id")
    expect(r.fields.find((f) => f.columnKey === "amount")?.currencySymbol).toBe(
      "₱",
    )
  })

  it("resolves listMobileCard groups with grid2 for amounts", () => {
    const cfg = {
      ...base,
      listColumnOrder: ["id", "name", "amount"] as const,
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          { layout: "rows" as const, columnKeys: ["name"] as const },
          {
            layout: "grid2" as const,
            columnKeys: ["amount"] as const,
          },
        ],
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.titleColumnKey).toBe("id")
    expect(r.groups?.length).toBe(2)
    expect(r.groups?.[1]?.layout).toBe("grid2")
    expect(r.fields.map((f) => f.columnKey)).toEqual(["id", "name", "amount"])
  })

  it("uses listMobileCard.columnKeys and titleColumnKey", () => {
    const cfg = {
      ...base,
      listMobileCard: {
        columnKeys: ["name", "amount", "id"] as const,
        titleColumnKey: "name" as const,
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.fields.map((f) => f.columnKey)).toEqual(["name", "amount", "id"])
    expect(r.titleColumnKey).toBe("name")
    expect(r.fields.find((f) => f.columnKey === "amount")?.currencySymbol).toBe(
      "₱",
    )
  })

  it("resolves mobileCollectionSummary group", () => {
    const cfg = {
      ...base,
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          {
            heading: "Collection",
            mobileCollectionSummary: {
              crColumnKey: "name",
              dateColumnKey: "amount",
              uncollectedText: "Not yet Collected",
            },
          },
        ],
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.groups?.[0]?.layout).toBe("collectionSummary")
    expect(r.groups?.[0]?.mobileCollectionSummary?.uncollectedText).toBe(
      "Not yet Collected",
    )
    expect(r.fields.map((f) => f.columnKey)).toEqual([
      "id",
      "name",
      "amount",
    ])
  })

  it("maps listMobileCardLabelStackedAbove onto resolved fields", () => {
    const cfg = {
      ...base,
      columns: base.columns.map((c) =>
        c.key === "name"
          ? { ...c, listMobileCardLabelStackedAbove: true as const }
          : c,
      ),
      listMobileCard: {
        columnKeys: ["name", "amount", "id"] as const,
        titleColumnKey: "name" as const,
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.fields.find((f) => f.columnKey === "name")?.labelStackedAbove).toBe(
      true,
    )
    expect(r.fields.find((f) => f.columnKey === "amount")?.labelStackedAbove).toBe(
      undefined,
    )
  })

  it("resolves titleRowOpensEditDialog from listMobileCard spec", () => {
    const cfg = {
      ...base,
      listMobileCard: {
        columnKeys: ["name", "amount", "id"] as const,
        titleColumnKey: "name" as const,
        titleRowOpensEditDialog: true as const,
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.titleRowOpensEditDialog).toBe(true)
  })

  it("throws when columnKeys references non-list column", () => {
    const cfg = {
      ...base,
      listMobileCard: { columnKeys: ["hidden"] as const },
    } as const satisfies AdminEntityDefinition
    expect(() => adminEntityListMobileCardFields(cfg)).toThrow(/hidden/)
  })

  it("resolves groups with titleColumnKey and returns ordered fields + group layouts", () => {
    const cfg = {
      ...base,
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          { heading: "A", layout: "rows" as const, columnKeys: ["name"] as const },
          {
            heading: "B",
            layout: "grid2" as const,
            columnKeys: ["amount"] as const,
          },
        ],
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.titleColumnKey).toBe("id")
    expect(r.fields.map((f) => f.columnKey)).toEqual(["id", "name", "amount"])
    expect(r.groups).toHaveLength(2)
    expect(r.groups?.[0]).toMatchObject({
      heading: "A",
      layout: "rows",
      fields: [{ columnKey: "name", label: "Name" }],
    })
    expect(r.groups?.[1]).toMatchObject({
      heading: "B",
      layout: "grid2",
      fields: [{ columnKey: "amount", label: "Amount", currencySymbol: "₱" }],
    })
  })

  it("maps listMobileCardOmitRowWhenEmpty onto resolved fields", () => {
    const cfg = {
      ...base,
      columns: base.columns.map((c) =>
        c.key === "amount"
          ? { ...c, listMobileCardOmitRowWhenEmpty: true as const }
          : c,
      ),
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          { columnKeys: ["name", "amount"] as const },
        ],
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.groups?.[0]?.fields.find((f) => f.columnKey === "amount"))
      .toMatchObject({ omitRowWhenEmpty: true })
    expect(r.groups?.[0]?.fields.find((f) => f.columnKey === "name"))
      .toMatchObject({ omitRowWhenEmpty: false })
  })

  it("resolves mobileQtyUnitLine.unitFromRelatedEmbed onto groups", () => {
    const cfg = {
      ...base,
      columns: [
        ...base.columns,
        {
          key: "qty",
          sqlName: "qty",
          label: "Qty",
          valueType: "numeric" as const,
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "unitCol",
          sqlName: "unit_col",
          label: "Unit",
          valueType: "text" as const,
          list: true,
          create: false,
          patch: false,
          sortable: false,
        },
      ],
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          {
            layout: "rows" as const,
            columnKeys: ["name", "amount"] as const,
            mobileQtyUnitLine: {
              qtyColumnKey: "qty" as const,
              unitColumnKey: "unitCol" as const,
              unitFromRelatedEmbed: {
                embedJsonKey: "inventory" as const,
                relatedFieldKey: "unit" as const,
              },
            },
          },
        ],
      },
    } as const satisfies AdminEntityDefinition
    const r = adminEntityListMobileCardFields(cfg)
    expect(r.groups?.[0]?.mobileQtyUnitLine).toEqual({
      qtyKey: "qty",
      unitKey: "unitCol",
      unitFromRelatedEmbed: {
        embedJsonKey: "inventory",
        relatedFieldKey: "unit",
      },
    })
  })

  it("throws when mobileQtyUnitLine.unitFromRelatedEmbed has empty embedJsonKey", () => {
    const cfg = {
      ...base,
      columns: [
        ...base.columns,
        {
          key: "qty",
          sqlName: "qty",
          label: "Qty",
          valueType: "numeric" as const,
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "unitCol",
          sqlName: "unit_col",
          label: "Unit",
          valueType: "text" as const,
          list: true,
          create: false,
          patch: false,
          sortable: false,
        },
      ],
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          {
            layout: "rows" as const,
            columnKeys: ["name", "amount"] as const,
            mobileQtyUnitLine: {
              qtyColumnKey: "qty" as const,
              unitColumnKey: "unitCol" as const,
              unitFromRelatedEmbed: {
                embedJsonKey: "" as const,
                relatedFieldKey: "unit" as const,
              },
            },
          },
        ],
      },
    } as const satisfies AdminEntityDefinition
    expect(() => adminEntityListMobileCardFields(cfg)).toThrow(
      /unitFromRelatedEmbed/,
    )
  })

  it("throws when mobileLineTotalsToggleForColumnKeys is set without mobileQtyUnitLine", () => {
    const cfg = {
      ...base,
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          {
            layout: "rows" as const,
            columnKeys: ["name"] as const,
            mobileLineTotalsToggleForColumnKeys: ["name"] as const,
          },
        ],
      },
    } as const satisfies AdminEntityDefinition
    expect(() => adminEntityListMobileCardFields(cfg)).toThrow(/mobileQtyUnitLine/)
  })

  it("throws when groups include titleColumnKey", () => {
    const cfg = {
      ...base,
      listMobileCard: {
        titleColumnKey: "id" as const,
        groups: [
          { columnKeys: ["id", "name"] as const },
        ],
      },
    } as const satisfies AdminEntityDefinition
    expect(() => adminEntityListMobileCardFields(cfg)).toThrow(/titleColumnKey/)
  })
})
