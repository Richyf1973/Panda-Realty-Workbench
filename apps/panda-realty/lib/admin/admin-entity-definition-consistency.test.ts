import { describe, expect, it } from "vitest"

import { collectAdminEntityListVirtualColumnIssues } from "@repo/admin/admin-entity-list-virtual-column-validation"

import {
  adminEntities,
  adminNavItems,
} from "@/lib/admin/admin-entities-bundled"
import { adminNavItemsClient } from "@/lib/admin/admin-nav-client"

describe("panda-realty admin entity definitions", () => {
  it("list virtual column metadata (relation label / VAT split) is well-formed", () => {
    const issues = collectAdminEntityListVirtualColumnIssues(adminEntities)
    expect(issues, issues.join("\n")).toEqual([])
  })

  it("adminNavItemsClient is the same array as adminNavItems", () => {
    expect(adminNavItemsClient).toBe(adminNavItems)
  })
})
