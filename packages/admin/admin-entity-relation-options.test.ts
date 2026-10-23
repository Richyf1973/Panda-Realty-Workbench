import { describe, expect, it } from "vitest"

import {
  adminEntityCrudRelationSelectOptionsForDisplay,
  adminEntityRelationOptionsEnsureSelected,
} from "./admin-entity-relation-options"

describe("adminEntityRelationOptionsEnsureSelected", () => {
  it("appends missing selected ids with id as label", () => {
    const out = adminEntityRelationOptionsEnsureSelected(
      [{ value: "1", label: "One" }],
      ["2"],
    )
    expect(out).toEqual([
      { value: "1", label: "One" },
      { value: "2", label: "2" },
    ])
  })
})

describe("adminEntityCrudRelationSelectOptionsForDisplay", () => {
  it("does not inject id-as-label while pending and id not in base options", () => {
    const { merged, resolving } = adminEntityCrudRelationSelectOptionsForDisplay(
      [],
      "42",
      true,
    )
    expect(merged).toEqual([])
    expect(resolving).toBe(true)
  })

  it("injects id-as-label when pending but option already in base list", () => {
    const { merged, resolving } = adminEntityCrudRelationSelectOptionsForDisplay(
      [{ value: "42", label: "Larry Nueva" }],
      "42",
      true,
    )
    expect(merged).toEqual([{ value: "42", label: "Larry Nueva" }])
    expect(resolving).toBe(false)
  })

  it("injects id-as-label after load when id missing from list (pagination)", () => {
    const { merged, resolving } = adminEntityCrudRelationSelectOptionsForDisplay(
      [],
      "99",
      false,
    )
    expect(merged).toEqual([{ value: "99", label: "99" }])
    expect(resolving).toBe(false)
  })
})
