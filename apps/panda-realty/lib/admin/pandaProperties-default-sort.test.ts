import { describe, expect, it } from "vitest"

import { pandaPropertiesEntity } from "./entities/pandaProperties"

// The properties list must DEFAULT to ordering by the next condition due (ascending), so the list
// opens with the soonest conditions on top and properties with no live condition (NULL) below in
// street order. listOrderBy drives the default sort when no URL sortKey is present.
describe("pandaProperties default list order — condition due ascending", () => {
  it("orders by nextConditionDue asc first", () => {
    expect(pandaPropertiesEntity.listOrderBy[0]).toEqual({
      columnKey: "nextConditionDue",
      direction: "asc",
    })
  })

  it("tie-breaks by streetAddress asc before the id tie-break", () => {
    const keys = pandaPropertiesEntity.listOrderBy.map((o) => o.columnKey)
    const streetIdx = keys.indexOf("streetAddress")
    const idIdx = keys.indexOf("propertyListId")
    expect(streetIdx).toBeGreaterThan(0)
    // streetAddress tie-break sits before the final id tie-break (id may be implicit, but when
    // present it must come after street).
    if (idIdx !== -1) {
      expect(streetIdx).toBeLessThan(idIdx)
    }
    const streetSpec = pandaPropertiesEntity.listOrderBy.find((o) => o.columnKey === "streetAddress")
    expect(streetSpec?.direction).toBe("asc")
  })

  it("defines a sortable nextConditionDue column", () => {
    const col = pandaPropertiesEntity.columns.find((c) => c.key === "nextConditionDue")
    expect(col).toBeDefined()
    expect(col?.sortable).toBe(true)
  })
})
