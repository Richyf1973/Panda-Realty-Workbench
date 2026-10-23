import { describe, expect, it } from "vitest"

import { adminEntityLinkedRowFromListApiItem } from "./admin-entity-linked-row-from-list-item"
import type { AdminEntityDefinition } from "./admin-entity-types"

describe("adminEntityLinkedRowFromListApiItem", () => {
  const miniSales = {
    columns: [
      {
        key: "drNumber",
        list: true,
        patch: false,
      },
      {
        key: "grossSales",
        list: true,
        patch: true,
      },
      {
        key: "secret",
        list: false,
        patch: false,
      },
    ],
    idColumn: { jsonKey: "drNumber", valueType: "text" },
  } as unknown as AdminEntityDefinition

  it("copies list + patch keys and id from list row", () => {
    const row = {
      drNumber: "A1",
      grossSales: "100",
      secret: "x",
      _cursor_drNumber: "c",
    }
    const out = adminEntityLinkedRowFromListApiItem(row, miniSales)
    expect(out.drNumber).toBe("A1")
    expect(out.grossSales).toBe("100")
    expect(out).not.toHaveProperty("secret")
    expect(out).not.toHaveProperty("_cursor_drNumber")
  })
})
