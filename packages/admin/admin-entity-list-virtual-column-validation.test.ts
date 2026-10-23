import { describe, expect, it } from "vitest"

import { collectAdminEntityListVirtualColumnIssues } from "./admin-entity-list-virtual-column-validation"
import type { AdminEntityDefinition } from "./admin-entity-types"

function fakeCustomers(): AdminEntityDefinition {
  return {
    adminPage: true as const,
    slug: "customers",
    schemaSqlName: "x.customers",
    apiBase: "/api/admin/customers",
    queryKey: ["admin", "customers"],
    nav: { label: "Customers" },
    metadataTitle: "Customers",
    idColumn: { jsonKey: "tinNo", valueType: "text" },
    deleteLabelColumnKey: "customerName",
    columns: [
      {
        key: "tinNo",
        sqlName: "tin_no",
        label: "TIN",
        valueType: "text",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
      {
        key: "customerName",
        sqlName: "customer_name",
        label: "Name",
        valueType: "text",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
      {
        key: "customerAddress",
        sqlName: "customer_address",
        label: "Address",
        valueType: "text",
        list: true,
        create: true,
        patch: true,
        sortable: false,
      },
    ],
    listOrderBy: [{ columnKey: "customerName", direction: "asc" }],
    ui: {
      title: "Customers",
      singular: "customer",
      addCardTitle: "Add",
      listTitle: "All",
      loadErrorLabel: "Error",
      emptyLabel: "Empty",
    },
  } as const satisfies AdminEntityDefinition
}

function fakeSalesWellFormed(): AdminEntityDefinition {
  return {
    adminPage: true as const,
    slug: "sales",
    schemaSqlName: "x.sales",
    apiBase: "/api/admin/sales",
    queryKey: ["admin", "sales"],
    nav: { label: "Sales" },
    metadataTitle: "Sales",
    idColumn: { jsonKey: "saleId", valueType: "integer" },
    deleteLabelColumnKey: "saleId",
    columns: [
      {
        key: "saleId",
        sqlName: "sale_id",
        label: "ID",
        valueType: "integer",
        list: true,
        create: false,
        patch: false,
        sortable: true,
      },
      {
        key: "tinNo",
        sqlName: "tin_no",
        label: "TIN",
        valueType: "text",
        list: true,
        create: true,
        patch: true,
        sortable: true,
        listRelation: {
          relatedEntitySlug: "customers",
          embedJsonKey: "customer",
          labelColumnKeys: ["customerName"],
          listCellShow: "storedFk",
        },
      },
      {
        key: "customerMirror",
        sqlName: "customer_mirror",
        label: "Customer",
        valueType: "text",
        list: true,
        create: false,
        patch: false,
        sortable: false,
        listVirtual: true,
        listVirtualRelationLabel: {
          sourceColumnKey: "tinNo",
          labelColumnKeys: ["customerName"],
        },
      },
      {
        key: "gross",
        sqlName: "gross",
        label: "Gross",
        valueType: "numeric",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
      {
        key: "net",
        sqlName: "net",
        label: "Net",
        valueType: "numeric",
        list: true,
        create: false,
        patch: false,
        sortable: false,
        listVirtual: true,
        listVirtualVat12InclusiveSplit: {
          grossColumnKey: "gross",
          component: "net",
        },
      },
      {
        key: "vat",
        sqlName: "vat",
        label: "VAT",
        valueType: "numeric",
        list: true,
        create: false,
        patch: false,
        sortable: false,
        listVirtual: true,
        listVirtualVat12InclusiveSplit: {
          grossColumnKey: "gross",
          component: "vat",
        },
      },
    ],
    listOrderBy: [{ columnKey: "saleId", direction: "desc" }],
    listAggregateSumColumnKeys: ["gross", "net", "vat"],
    ui: {
      title: "Sales",
      singular: "sale",
      addCardTitle: "Add",
      listTitle: "All",
      loadErrorLabel: "Error",
      emptyLabel: "Empty",
    },
  } as const satisfies AdminEntityDefinition
}

function fakeSubtractLedger(): AdminEntityDefinition {
  return {
    adminPage: true as const,
    slug: "ledger",
    schemaSqlName: "x.ledger",
    apiBase: "/api/admin/ledger",
    queryKey: ["admin", "ledger"],
    nav: { label: "Ledger" },
    metadataTitle: "Ledger",
    idColumn: { jsonKey: "id", valueType: "integer" },
    deleteLabelColumnKey: "id",
    columns: [
      {
        key: "id",
        sqlName: "id",
        label: "ID",
        valueType: "integer",
        list: true,
        create: false,
        patch: false,
        sortable: true,
      },
      {
        key: "grossSales",
        sqlName: "gross_sales",
        label: "Gross",
        valueType: "numeric",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
      {
        key: "discount",
        sqlName: "discount",
        label: "Discount",
        valueType: "numeric",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
      {
        key: "netSales",
        sqlName: "net_sales",
        label: "Net",
        valueType: "numeric",
        list: true,
        create: false,
        patch: false,
        sortable: false,
        listVirtual: true,
        listVirtualSubtractFromBase: {
          baseColumnKey: "grossSales",
          subtractColumnKeys: ["discount"],
        },
      },
    ],
    listOrderBy: [{ columnKey: "id", direction: "desc" }],
    ui: {
      title: "Ledger",
      singular: "row",
      addCardTitle: "Add",
      listTitle: "All",
      loadErrorLabel: "Error",
      emptyLabel: "Empty",
    },
  } as const satisfies AdminEntityDefinition
}

describe("collectAdminEntityListVirtualColumnIssues", () => {
  it("accepts well-formed listVirtualRelationLabel and listVirtualVat12InclusiveSplit", () => {
    const issues = collectAdminEntityListVirtualColumnIssues({
      customers: fakeCustomers(),
      sales: fakeSalesWellFormed(),
    })
    expect(issues).toEqual([])
  })

  it("accepts well-formed listVirtualSubtractFromBase", () => {
    const issues = collectAdminEntityListVirtualColumnIssues({
      ledger: fakeSubtractLedger(),
    })
    expect(issues).toEqual([])
  })

  it("rejects listVirtualRelationLabel without listVirtual", () => {
    const base = fakeSalesWellFormed()
    const col = base.columns.find((c) => c.key === "customerMirror")!
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "customerMirror" ? { ...c, listVirtual: false } : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "sales.customerMirror: listVirtualRelationLabel requires listVirtual: true",
    )
  })

  it("rejects listVirtualRelationLabel when source column lacks listRelation", () => {
    const base = fakeSalesWellFormed()
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "tinNo"
            ? { ...c, listRelation: undefined }
            : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "sales.customerMirror: listVirtualRelationLabel.sourceColumnKey must reference a column with listRelation",
    )
  })

  it("rejects listVirtualRelationLabel when label key is missing on related entity", () => {
    const base = fakeSalesWellFormed()
    const col = base.columns.find((c) => c.key === "customerMirror")!
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "customerMirror"
            ? {
                ...col,
                listVirtualRelationLabel: {
                  sourceColumnKey: "tinNo",
                  labelColumnKeys: ["typoName"],
                },
              }
            : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      'sales.customerMirror: listVirtualRelationLabel.labelColumnKeys includes "typoName" missing on customers',
    )
  })

  it("rejects listVirtualVat12InclusiveSplit when gross column is virtual", () => {
    const base = fakeSalesWellFormed()
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "gross" ? { ...c, listVirtual: true } : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "sales.net: listVirtualVat12InclusiveSplit.grossColumnKey must be a physical column (not listVirtual)",
    )
  })

  it("rejects listVirtualVat12InclusiveSplit in listOrderBy", () => {
    const base = fakeSalesWellFormed()
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        listOrderBy: [{ columnKey: "net", direction: "asc" }],
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "sales.net: listVirtualVat12InclusiveSplit column must not appear in listOrderBy",
    )
  })

  it("rejects listVirtualVat12InclusiveSplit combined with listVirtualSubtractFromBase", () => {
    const base = fakeSalesWellFormed()
    const net = base.columns.find((c) => c.key === "net")!
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "net"
            ? {
                ...net,
                listVirtualSubtractFromBase: {
                  baseColumnKey: "gross",
                  subtractColumnKeys: ["gross"],
                },
              }
            : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "sales.net: at most one of listVirtualRelationLabel, listVirtualVat12InclusiveSplit, listYearMonthPair (with list + listVirtual), listVirtualSubtractFromBase, listVirtualProductOfTwo, listVirtualDateExistsInTable, listVirtualRoundedDayDiffTimestamps, listVirtualPostdatedDaysUntilMaturity, listVirtualJunctionLinkedNetMinusMainColumn, listVirtualJunctionLinkedNetSum, listVirtualJunctionScalarPick, listVirtualOrderByRelatedColumn",
    )
  })

  it("rejects listVirtualSubtractFromBase when base column is virtual", () => {
    const base = fakeSubtractLedger()
    const entities = {
      ledger: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "grossSales" ? { ...c, listVirtual: true } : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "ledger.netSales: listVirtualSubtractFromBase.baseColumnKey must be a physical column (not listVirtual)",
    )
  })

  it("rejects listVirtualSubtractFromBase in listOrderBy", () => {
    const base = fakeSubtractLedger()
    const entities = {
      ledger: {
        ...base,
        listOrderBy: [{ columnKey: "netSales", direction: "asc" }],
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "ledger.netSales: listVirtualSubtractFromBase column must not appear in listOrderBy",
    )
  })

  it("rejects both listVirtualRelationLabel and listVirtualVat12InclusiveSplit on same column", () => {
    const base = fakeSalesWellFormed()
    const net = base.columns.find((c) => c.key === "net")!
    const entities = {
      customers: fakeCustomers(),
      sales: {
        ...base,
        columns: base.columns.map((c) =>
          c.key === "net"
            ? {
                ...net,
                listVirtualRelationLabel: {
                  sourceColumnKey: "tinNo",
                  labelColumnKeys: ["customerName"],
                },
              }
            : c,
        ),
      } as AdminEntityDefinition,
    }
    expect(collectAdminEntityListVirtualColumnIssues(entities)).toContain(
      "sales.net: listVirtualRelationLabel and listVirtualVat12InclusiveSplit are mutually exclusive",
    )
  })
})
