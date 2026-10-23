import { describe, expect, it } from "vitest"

import { propertiesQuickTableFiltersActive } from "./properties-quick-table-filters"

describe("propertiesQuickTableFiltersActive", () => {
  it("is false when only append-hints and search and status are empty", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: {},
        listSearchDebounced: "",
        relationFilterSelections: {},
      }),
    ).toBe(false)
  })

  it("is false when segments, search, and status are all blank", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: {},
        listSearchDebounced: "   ",
        relationFilterSelections: { propertyStatusId: "" },
      }),
    ).toBe(false)
  })

  it("is true when streetFilter segment is set", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: { streetFilter: "SomeStreet~QLD" },
        listSearchDebounced: "",
        relationFilterSelections: {},
      }),
    ).toBe(true)
  })

  it("is true when suburb hint is set", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: { suburb: "Caboolture" },
        listSearchDebounced: "",
        relationFilterSelections: {},
      }),
    ).toBe(true)
  })

  it("is true when generalSearch is set", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: { generalSearch: "buyer" },
        listSearchDebounced: "",
        relationFilterSelections: {},
      }),
    ).toBe(true)
  })

  it("is true when main list search is non-empty", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: {},
        listSearchDebounced: "waterview",
        relationFilterSelections: {},
      }),
    ).toBe(true)
  })

  it("is false when only status relation selection is non-empty (status no longer triggers quick mode)", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: {},
        listSearchDebounced: "",
        relationFilterSelections: { propertyStatusId: "1,2" },
      }),
    ).toBe(false)
  })

  it("is true when suburb hint set regardless of status (suburb still triggers quick mode)", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: { suburb: "X" },
        listSearchDebounced: "",
        relationFilterSelections: { propertyStatusId: "1" },
      }),
    ).toBe(true)
  })

  it("is true when suburb and empty status (combined narrowing)", () => {
    expect(
      propertiesQuickTableFiltersActive({
        listAppendWhereHintSegments: { suburb: "X" },
        listSearchDebounced: "",
        relationFilterSelections: { propertyStatusId: "" },
      }),
    ).toBe(true)
  })
})
