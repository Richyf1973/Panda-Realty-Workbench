import { describe, expect, it } from "vitest"

import {
  ADMIN_ENTITY_LIST_LAYOUT_PARAM,
  parseAdminEntityListLayoutFromSearchParams,
} from "./admin-entity-admin-list-fetch"
import type { AdminEntityDefinition } from "./admin-entity-types"

const baseCfg = {
  adminPage: true,
  slug: "demo",
  schemaSqlName: "public.demo",
  apiBase: "/api/admin/demo",
  queryKey: ["admin", "demo"] as const,
  nav: { label: "Demo" },
  metadataTitle: "Demo",
  idColumn: { jsonKey: "id", valueType: "integer" as const },
  deleteLabelColumnKey: "name",
  columns: [],
  listOrderBy: [{ columnKey: "id", direction: "asc" as const }],
  ui: {
    title: "Demo",
    singular: "row",
    addCardTitle: "Add",
    listTitle: "Demo",
    loadErrorLabel: "",
    emptyLabel: "",
  },
} as const satisfies AdminEntityDefinition

describe("admin entity list layout URL", () => {
  it("defaults to table when listGrid is absent", () => {
    const sp = new URLSearchParams(`${ADMIN_ENTITY_LIST_LAYOUT_PARAM}=grid`)
    expect(parseAdminEntityListLayoutFromSearchParams(baseCfg, sp)).toBe(
      "table",
    )
  })

  it("reads listLayout from query when listGrid is set", () => {
    const cfg = {
      ...baseCfg,
      listGrid: { defaultMode: "table" as const },
    } satisfies AdminEntityDefinition
    expect(
      parseAdminEntityListLayoutFromSearchParams(
        cfg,
        new URLSearchParams(""),
      ),
    ).toBe("table")
    expect(
      parseAdminEntityListLayoutFromSearchParams(
        cfg,
        new URLSearchParams(`${ADMIN_ENTITY_LIST_LAYOUT_PARAM}=grid`),
      ),
    ).toBe("grid")
    const gridDefault = {
      ...baseCfg,
      listGrid: { defaultMode: "grid" as const },
    } satisfies AdminEntityDefinition
    expect(
      parseAdminEntityListLayoutFromSearchParams(
        gridDefault,
        new URLSearchParams(""),
      ),
    ).toBe("grid")
  })
})
