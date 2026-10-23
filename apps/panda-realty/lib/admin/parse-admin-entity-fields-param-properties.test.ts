import { describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({ NextResponse: { json: vi.fn() } }))

import { parseAdminEntityFieldsParam } from "@repo/admin/admin-api"
import { pandaPropertiesEntity } from "./entities/pandaProperties"

describe("parseAdminEntityFieldsParam — properties entity", () => {
  it("null raw returns ok with null fields (no filtering)", () => {
    const result = parseAdminEntityFieldsParam(pandaPropertiesEntity, null)
    expect(result).toEqual({ ok: true, fields: null })
  })

  it("empty string returns ok with null fields", () => {
    const result = parseAdminEntityFieldsParam(pandaPropertiesEntity, "")
    expect(result).toEqual({ ok: true, fields: null })
  })

  it("?fields=streetAddress,state,postcode — the original address subset — works and injects propertyListId", () => {
    const result = parseAdminEntityFieldsParam(
      pandaPropertiesEntity,
      "streetAddress,state,postcode",
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields).toEqual(
      new Set(["propertyListId", "streetAddress", "state", "postcode"]),
    )
  })

  it("single field — ?fields=streetAddress — injects id even when only one field requested", () => {
    const result = parseAdminEntityFieldsParam(pandaPropertiesEntity, "streetAddress")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields).toContain("propertyListId")
    expect(result.fields).toContain("streetAddress")
    expect(result.fields!.size).toBe(2)
  })

  it("requesting propertyListId explicitly does not duplicate it in the set", () => {
    const result = parseAdminEntityFieldsParam(
      pandaPropertiesEntity,
      "propertyListId,streetAddress",
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields!.size).toBe(2)
    expect(result.fields).toEqual(new Set(["propertyListId", "streetAddress"]))
  })

  it("unknown field returns error with the offending field name", () => {
    const result = parseAdminEntityFieldsParam(pandaPropertiesEntity, "nonExistentField")
    expect(result).toEqual({ ok: false, unknownField: "nonExistentField" })
  })

  it("stops at the first unknown field when multiple are requested", () => {
    const result = parseAdminEntityFieldsParam(
      pandaPropertiesEntity,
      "streetAddress,bogus,suburb",
    )
    expect(result).toEqual({ ok: false, unknownField: "bogus" })
  })

  it("whitespace around field names is trimmed", () => {
    const result = parseAdminEntityFieldsParam(
      pandaPropertiesEntity,
      " streetAddress , state , postcode ",
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields).toEqual(
      new Set(["propertyListId", "streetAddress", "state", "postcode"]),
    )
  })

  it("all valid column keys are accepted individually", () => {
    const validKeys = pandaPropertiesEntity.columns.map((c) => c.key)
    for (const key of validKeys) {
      const result = parseAdminEntityFieldsParam(pandaPropertiesEntity, key)
      expect(result.ok, `key "${key}" should be accepted`).toBe(true)
    }
  })
})
