import { describe, expect, it } from "vitest"

import { adminEntityFormColumnsInOrder } from "./admin-entity-form-column-order"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

const col = (
  key: string,
  flags: { create?: boolean; patch?: boolean },
): AdminEntityColumn =>
  ({
    key,
    sqlName: key,
    label: key,
    valueType: "text",
    list: false,
    create: flags.create ?? true,
    patch: flags.patch ?? true,
    sortable: false,
  }) as AdminEntityColumn

describe("adminEntityFormColumnsInOrder", () => {
  it("appends crudFormAfterRelatedColumnKeys when formColumnOrder is explicit", () => {
    const cfg = {
      slug: "x",
      columns: [
        col("a", { patch: true }),
        col("b", { patch: true }),
        col("z", { patch: true }),
      ],
      formColumnOrder: ["a"] as const,
      crudFormAfterRelatedColumnKeys: ["b", "z"] as const,
    } as const satisfies Pick<
      AdminEntityDefinition,
      "slug" | "columns" | "formColumnOrder" | "crudFormAfterRelatedColumnKeys"
    >

    const patch = adminEntityFormColumnsInOrder(cfg as AdminEntityDefinition, "patch")
    expect(patch.map((c) => c.key)).toEqual(["a", "b", "z"])
  })

  it("does not duplicate keys present in both formColumnOrder and after-related", () => {
    const cfg = {
      slug: "x",
      columns: [col("a", {}), col("b", {})],
      formColumnOrder: ["a", "b"] as const,
      crudFormAfterRelatedColumnKeys: ["b"] as const,
    } as const satisfies Pick<
      AdminEntityDefinition,
      "slug" | "columns" | "formColumnOrder" | "crudFormAfterRelatedColumnKeys"
    >

    const create = adminEntityFormColumnsInOrder(cfg as AdminEntityDefinition, "create")
    expect(create.map((c) => c.key)).toEqual(["a", "b"])
  })
})
