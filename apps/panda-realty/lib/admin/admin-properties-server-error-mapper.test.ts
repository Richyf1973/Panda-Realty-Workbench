import { describe, expect, it } from "vitest"

import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"

import { mapPropertiesServerErrorToFields } from "./admin-properties-server-error-mapper"

/** Minimal stub with the columns relevant to these tests. */
const stubDefinition = {
  columns: [
    { key: "commissionRate", label: "Commission rate", valueType: "numeric" as const },
    { key: "streetAddress", label: "Street Address", valueType: "string" as const },
    { key: "salePrice", label: "Offer", valueType: "numeric" as const },
  ],
} as unknown as AdminEntityDefinition

describe("mapPropertiesServerErrorToFields", () => {
  it("maps 'Commission rate must be numeric' to commissionRate field", () => {
    const result = mapPropertiesServerErrorToFields(
      new Error("Commission rate must be numeric"),
      stubDefinition,
    )
    expect(result).toEqual({ commissionRate: "Commission rate must be numeric" })
  })

  it("maps 'Street Address must be ...' to streetAddress field", () => {
    const result = mapPropertiesServerErrorToFields(
      new Error("Street Address must be provided"),
      stubDefinition,
    )
    expect(result).toEqual({ streetAddress: "Street Address must be provided" })
  })

  it("returns undefined when message does not match any column label", () => {
    const result = mapPropertiesServerErrorToFields(
      new Error("Something went wrong"),
      stubDefinition,
    )
    expect(result).toBeUndefined()
  })

  it("returns undefined for an empty message", () => {
    const result = mapPropertiesServerErrorToFields(new Error(""), stubDefinition)
    expect(result).toBeUndefined()
  })

  it("does not match a partial label prefix", () => {
    // "Commission" alone does not start a column label
    const result = mapPropertiesServerErrorToFields(
      new Error("Commission must be numeric"),
      stubDefinition,
    )
    expect(result).toBeUndefined()
  })
})
