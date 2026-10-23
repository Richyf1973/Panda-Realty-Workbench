import { describe, expect, it } from "vitest"

import { adminEntityListCellHiddenBySiblings } from "./admin-entity-list-cell"
import type { AdminEntityColumn } from "./admin-entity-types"

function col(overrides: Partial<AdminEntityColumn>): AdminEntityColumn {
  return {
    key: "salePrice",
    label: "Last sale price",
    valueType: "numeric",
    ...overrides,
  } as AdminEntityColumn
}

describe("adminEntityListCellHiddenBySiblings", () => {
  it("returns false when the field has no hide-when-sibling keys", () => {
    expect(adminEntityListCellHiddenBySiblings({ salePrice: 385000 }, col({}))).toBe(false)
  })

  it("returns false when the named siblings are all empty/null", () => {
    const field = col({ listCellHideWhenSiblingPresentKeys: ["contractPrice", "appraisedAmount"] })
    expect(
      adminEntityListCellHiddenBySiblings(
        { salePrice: 385000, contractPrice: null, appraisedAmount: null },
        field,
      ),
    ).toBe(false)
    expect(
      adminEntityListCellHiddenBySiblings(
        { salePrice: 385000, contractPrice: "", appraisedAmount: "   " },
        field,
      ),
    ).toBe(false)
  })

  it("returns true when the contract-price sibling has a value", () => {
    const field = col({ listCellHideWhenSiblingPresentKeys: ["contractPrice", "appraisedAmount"] })
    expect(
      adminEntityListCellHiddenBySiblings(
        { salePrice: 385000, contractPrice: "940000", appraisedAmount: null },
        field,
      ),
    ).toBe(true)
  })

  it("returns true when only the appraised sibling has a value", () => {
    const field = col({ listCellHideWhenSiblingPresentKeys: ["contractPrice", "appraisedAmount"] })
    expect(
      adminEntityListCellHiddenBySiblings(
        { salePrice: 899000, contractPrice: null, appraisedAmount: 850000 },
        field,
      ),
    ).toBe(true)
  })

  it("returns true when both siblings have a value", () => {
    const field = col({ listCellHideWhenSiblingPresentKeys: ["contractPrice", "appraisedAmount"] })
    expect(
      adminEntityListCellHiddenBySiblings(
        { salePrice: 385000, contractPrice: "940000", appraisedAmount: 870000 },
        field,
      ),
    ).toBe(true)
  })
})
