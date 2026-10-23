import { integer, pgTable, text } from "drizzle-orm/pg-core"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildAdminEntityListSqlContext } from "./admin-entity-list-sql-context"
import { coerceBoundaryRow } from "./admin-entity-list-cursor"
import type { AdminEntityDefinition } from "./admin-entity-types"

const propertyStatusTable = pgTable("property_status", {
  propertyStatusId: integer("property_status_id"),
  propertyStatusCode: text("property_status_code"),
  propertyStatus: text("property_status"),
  sortOrder: integer("sort_order"),
})

const propertiesTable = pgTable("panda_properties", {
  propertyListId: integer("property_list_id"),
  propertyStatusId: integer("property_status_id"),
})

const propertyStatusEntity = {
  adminPage: false as const,
  slug: "property-status",
  schemaSqlName: "panda_realty.property_status",
  apiBase: "/api/admin/property-status",
  queryKey: ["admin", "property-status"] as const,
  nav: { label: "Property status" },
  metadataTitle: "Property status",
  idColumn: { jsonKey: "propertyStatusId" as const, valueType: "integer" as const },
  deleteLabelColumnKey: "propertyStatusCode",
  columns: [
    {
      key: "propertyStatusId",
      sqlName: "property_status_id",
      label: "ID",
      valueType: "integer" as const,
      list: true,
      create: false,
      patch: false,
      sortable: true,
    },
    {
      key: "propertyStatusCode",
      sqlName: "property_status_code",
      label: "Code",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: true,
    },
    {
      key: "propertyStatus",
      sqlName: "property_status",
      label: "Label",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: true,
    },
    {
      key: "sortOrder",
      sqlName: "sort_order",
      label: "Order",
      valueType: "integer" as const,
      list: false,
      create: false,
      patch: false,
      sortable: false,
    },
  ],
  listOrderBy: [{ columnKey: "sortOrder", direction: "asc" as const }],
  ui: {
    title: "Property status",
    singular: "property status",
    addCardTitle: "Add property status",
    listTitle: "Property status",
    loadErrorLabel: "Could not load property status rows.",
    emptyLabel: "No property status rows yet.",
  },
} as const satisfies AdminEntityDefinition

const propertiesEntity = {
  adminPage: true as const,
  slug: "properties",
  schemaSqlName: "panda_realty.panda_properties",
  apiBase: "/api/admin/properties",
  queryKey: ["admin", "properties"] as const,
  nav: { label: "Properties" },
  metadataTitle: "Properties",
  idColumn: { jsonKey: "propertyListId" as const, valueType: "integer" as const },
  deleteLabelColumnKey: "propertyListId",
  columns: [
    {
      key: "propertyListId",
      sqlName: "property_list_id",
      label: "ID",
      valueType: "integer" as const,
      list: true,
      create: false,
      patch: false,
      sortable: true,
    },
    {
      key: "propertyStatusId",
      sqlName: "property_status_id",
      label: "Status",
      valueType: "integer" as const,
      list: true,
      create: true,
      patch: true,
      sortable: true,
      listRelation: {
        relatedEntitySlug: "property-status",
        embedJsonKey: "propertyStatusRow",
        labelColumnKeys: ["propertyStatusCode"] as const,
        orderByRelatedColumnKey: "sortOrder",
      },
    },
  ],
  listOrderBy: [{ columnKey: "propertyStatusId", direction: "asc" as const }],
  ui: {
    title: "Properties",
    singular: "property",
    addCardTitle: "Add property",
    listTitle: "Properties",
    loadErrorLabel: "Could not load properties.",
    emptyLabel: "No properties yet.",
  },
} as const satisfies AdminEntityDefinition

const entities = {
  "property-status": propertyStatusEntity,
  properties: propertiesEntity,
} as const

const tables = {
  "property-status": propertyStatusTable,
  properties: propertiesTable,
} as const

describe("property status related ordering", () => {
  it("orders the properties status column by property_status.sort_order", () => {
    const ctx = buildAdminEntityListSqlContext(
      entities,
      tables,
      "properties",
      [{ columnKey: "propertyStatusId", direction: "asc" }],
    )
    expect(ctx.orderParts[0]?.expr).toBe(propertyStatusTable.sortOrder)
  })

  it("coerces cursor values using the related sort column type", () => {
    const boundary = coerceBoundaryRow(
      entities,
      "properties",
      [
        { columnKey: "propertyStatusId", direction: "asc" },
        { columnKey: "propertyListId", direction: "asc" },
      ],
      [3, 9001],
    )
    expect(boundary).toEqual([3, 9001])
  })
})
