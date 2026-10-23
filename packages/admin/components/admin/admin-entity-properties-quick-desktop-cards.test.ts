import { describe, expect, it } from "vitest"

import { adminEntityPropertiesQuickDesktopCardsActive } from "./admin-entity-properties-quick-desktop-cards"

describe("adminEntityPropertiesQuickDesktopCardsActive", () => {
  it("is true only for properties desktop table when quick column keys are active", () => {
    expect(
      adminEntityPropertiesQuickDesktopCardsActive({
        slug: "properties",
        isCompactListViewport: false,
        listLayoutMode: "table",
        hasQuickColumnKeys: true,
      }),
    ).toBe(true)
  })

  it("is false on compact viewport even when quick keys would resolve", () => {
    expect(
      adminEntityPropertiesQuickDesktopCardsActive({
        slug: "properties",
        isCompactListViewport: true,
        listLayoutMode: "table",
        hasQuickColumnKeys: true,
      }),
    ).toBe(false)
  })

  it("is false when quick keys are inactive", () => {
    expect(
      adminEntityPropertiesQuickDesktopCardsActive({
        slug: "properties",
        isCompactListViewport: false,
        listLayoutMode: "table",
        hasQuickColumnKeys: false,
      }),
    ).toBe(false)
  })

  it("is false for a slug that does not support quick cards", () => {
    expect(
      adminEntityPropertiesQuickDesktopCardsActive({
        slug: "entities",
        isCompactListViewport: false,
        listLayoutMode: "table",
        hasQuickColumnKeys: true,
      }),
    ).toBe(false)
  })

  it("is true for property-forms on desktop table when quick column keys are active", () => {
    expect(
      adminEntityPropertiesQuickDesktopCardsActive({
        slug: "property-forms",
        isCompactListViewport: false,
        listLayoutMode: "table",
        hasQuickColumnKeys: true,
      }),
    ).toBe(true)
  })
})
