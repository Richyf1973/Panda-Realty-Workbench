import { describe, expect, it } from "vitest"

import { resolveRowActionsLayout } from "./admin-entity-row-actions-layout"

describe("resolveRowActionsLayout", () => {
  it("renders pinned-only when a pinned-only row provides pinned actions (map results)", () => {
    expect(
      resolveRowActionsLayout({ hasPinned: true, collapsibleCount: 0, pinnedOnly: true }),
    ).toBe("pinned-only")
  })

  it("renders responsive when pinned actions exist but the collapsible list is empty", () => {
    // Regression guard: an empty collapsible list must NOT drop pinned controls to the legacy path.
    expect(
      resolveRowActionsLayout({ hasPinned: true, collapsibleCount: 0, pinnedOnly: false }),
    ).toBe("responsive")
  })

  it("renders responsive when collapsible actions exist", () => {
    expect(
      resolveRowActionsLayout({ hasPinned: true, collapsibleCount: 5, pinnedOnly: false }),
    ).toBe("responsive")
    expect(
      resolveRowActionsLayout({ hasPinned: false, collapsibleCount: 3, pinnedOnly: false }),
    ).toBe("responsive")
  })

  it("renders legacy (edit/delete) when there are no pinned and no collapsible actions", () => {
    expect(
      resolveRowActionsLayout({ hasPinned: false, collapsibleCount: 0, pinnedOnly: false }),
    ).toBe("legacy")
  })

  it("falls back to legacy when pinnedOnly is set but nothing is pinned or collapsible", () => {
    expect(
      resolveRowActionsLayout({ hasPinned: false, collapsibleCount: 0, pinnedOnly: true }),
    ).toBe("legacy")
  })
})
