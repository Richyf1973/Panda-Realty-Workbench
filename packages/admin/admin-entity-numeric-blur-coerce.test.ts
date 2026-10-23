import { describe, expect, it } from "vitest"

import {
  adminEntityNumericCoerceEmptyToZeroOnBlur,
  nextCoercedAdminEntityNumericStringOnBlur,
} from "./admin-entity-numeric-blur-coerce"
import type { AdminEntityColumn } from "./admin-entity-types"

function col(partial: Partial<AdminEntityColumn> & Pick<AdminEntityColumn, "key">): AdminEntityColumn {
  return {
    label: partial.key,
    patch: true,
    create: true,
    ...partial,
  } as AdminEntityColumn
}

describe("adminEntityNumericCoerceEmptyToZeroOnBlur", () => {
  it("create: coerces when optionalOnCreate is not set", () => {
    expect(
      adminEntityNumericCoerceEmptyToZeroOnBlur(
        col({ key: "qty", valueType: "integer" }),
        "create",
      ),
    ).toBe(true)
  })

  it("create: skips when optionalOnCreate", () => {
    expect(
      adminEntityNumericCoerceEmptyToZeroOnBlur(
        col({ key: "x", valueType: "integer", optionalOnCreate: true }),
        "create",
      ),
    ).toBe(false)
  })

  it("edit: coerces when patchEmptyClears is not true", () => {
    expect(
      adminEntityNumericCoerceEmptyToZeroOnBlur(
        col({ key: "qty", valueType: "numeric" }),
        "edit",
      ),
    ).toBe(true)
  })

  it("edit: skips when patchEmptyClears (nullable clear)", () => {
    expect(
      adminEntityNumericCoerceEmptyToZeroOnBlur(
        col({ key: "x", valueType: "numeric", patchEmptyClears: true }),
        "edit",
      ),
    ).toBe(false)
  })

  it("skips integer select columns", () => {
    expect(
      adminEntityNumericCoerceEmptyToZeroOnBlur(
        col({
          key: "tier",
          valueType: "integer",
          integerFormOptions: [{ value: 1, label: "A" }],
        }),
        "create",
      ),
    ).toBe(false)
  })
})

describe("nextCoercedAdminEntityNumericStringOnBlur", () => {
  it("returns 0 for empty integer when required", () => {
    expect(
      nextCoercedAdminEntityNumericStringOnBlur(
        col({ key: "n", valueType: "integer" }),
        "create",
        "",
      ),
    ).toBe("0")
  })

  it("returns null when integer has digits", () => {
    expect(
      nextCoercedAdminEntityNumericStringOnBlur(
        col({ key: "n", valueType: "integer" }),
        "create",
        "12",
      ),
    ).toBe(null)
  })

  it("returns 0 for incomplete decimal when required", () => {
    expect(
      nextCoercedAdminEntityNumericStringOnBlur(
        col({ key: "amt", valueType: "numeric" }),
        "create",
        ".",
      ),
    ).toBe("0")
  })

  it("returns 0 for lone minus on signed integer when required", () => {
    expect(
      nextCoercedAdminEntityNumericStringOnBlur(
        col({ key: "n", valueType: "integer", integerInputAllowLeadingMinus: true }),
        "create",
        "-",
      ),
    ).toBe("0")
  })
})
