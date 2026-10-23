import { describe, expect, it } from "vitest"

import type { AdminEntityColumn } from "./admin-entity-types"
import {
  resolveRelatedInlineEditableColumnAlign,
  resolveRelatedInlineReadonlyColumnAlign,
} from "./admin-entity-crud-related-inline-helpers"

function col(partial: Partial<AdminEntityColumn>): AdminEntityColumn {
  return {
    key: "x",
    sqlName: "x",
    label: "X",
    valueType: "text",
    list: true,
    create: true,
    patch: true,
    sortable: false,
    ...partial,
  } as AdminEntityColumn
}

describe("resolveRelatedInlineEditableColumnAlign", () => {
  it("right-aligns numeric and plain integer inputs", () => {
    expect(
      resolveRelatedInlineEditableColumnAlign(
        col({ valueType: "numeric", docSqlType: "numeric" }),
      ),
    ).toBe("right")
    expect(
      resolveRelatedInlineEditableColumnAlign(
        col({
          valueType: "integer",
          integerFormOptions: undefined,
          listRelation: undefined,
        }),
      ),
    ).toBe("right")
  })

  it("left-aligns integer select controls", () => {
    expect(
      resolveRelatedInlineEditableColumnAlign(
        col({
          valueType: "integer",
          integerFormOptions: [
            { value: "1", label: "One" },
          ] as AdminEntityColumn["integerFormOptions"],
        }),
      ),
    ).toBe("left")
  })
})

describe("resolveRelatedInlineReadonlyColumnAlign", () => {
  it("right-aligns formatted numeric and plain integer readonly cells", () => {
    expect(
      resolveRelatedInlineReadonlyColumnAlign(
        col({ valueType: "numeric" }),
      ),
    ).toBe("right")
    expect(
      resolveRelatedInlineReadonlyColumnAlign(
        col({ valueType: "integer" }),
      ),
    ).toBe("right")
  })
})
