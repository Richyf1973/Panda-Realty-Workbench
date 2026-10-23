import { describe, expect, it } from "vitest"

import {
  adminEntityExtrasPayloadUnchanged,
  adminEntityPatchExtrasBaselineFromRow,
  buildAdminEntityPatchRequestPayloadPartial,
} from "./admin-entity-patch-partial"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

describe("adminEntityExtrasPayloadUnchanged", () => {
  it("treats objects with different key order as equal", () => {
    expect(
      adminEntityExtrasPayloadUnchanged({ b: 1, a: 2 }, { a: 2, b: 1 }),
    ).toBe(true)
  })

  it("detects nested key-order differences", () => {
    expect(
      adminEntityExtrasPayloadUnchanged(
        { x: { z: 1, y: 2 } },
        { x: { y: 2, z: 1 } },
      ),
    ).toBe(true)
  })

  it("returns false when values differ", () => {
    expect(adminEntityExtrasPayloadUnchanged({ a: 1 }, { a: 2 })).toBe(false)
  })
})

describe("adminEntityPatchExtrasBaselineFromRow", () => {
  const cfg = {
    extraPatchBodyKeys: ["payrolls", "meta"],
  } as AdminEntityDefinition

  it("copies only configured extra keys when present on the row", () => {
    expect(
      adminEntityPatchExtrasBaselineFromRow(cfg, {
        id: 1,
        payrolls: [{ p: 1 }],
        meta: { a: 1 },
        other: "skip",
      }),
    ).toEqual({
      payrolls: [{ p: 1 }],
      meta: { a: 1 },
    })
  })
})

describe("buildAdminEntityPatchRequestPayloadPartial", () => {
  const boolCol = {
    key: "active",
    sqlName: "active",
    label: "Active",
    valueType: "boolean",
    list: true,
    create: true,
    patch: true,
    sortable: false,
  } as AdminEntityColumn

  const cfg = {
    slug: "demo",
    columns: [boolCol],
  } as AdminEntityDefinition
  const entities = {} as Readonly<Record<string, AdminEntityDefinition>>

  it("returns empty object when form matches baseline", () => {
    const patch = buildAdminEntityPatchRequestPayloadPartial({
      cfg,
      patchCols: [boolCol],
      value: { active: "true" },
      entities,
      baselineForm: { active: "true" },
    })
    expect(patch).toEqual({})
  })

  it("includes keys that changed vs baseline", () => {
    const patch = buildAdminEntityPatchRequestPayloadPartial({
      cfg,
      patchCols: [boolCol],
      value: { active: "false" },
      entities,
      baselineForm: { active: "true" },
    })
    expect(patch).toEqual({ active: "false" })
  })
})
