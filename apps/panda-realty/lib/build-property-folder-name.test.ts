import { describe, expect, it } from "vitest"

import { buildPropertyFolderName } from "./build-property-folder-name"

describe("buildPropertyFolderName", () => {
  it("joins address parts with single spaces", () => {
    expect(buildPropertyFolderName("42 Test St", "Springwood", "QLD", "4127")).toBe(
      "42 Test St Springwood QLD 4127",
    )
  })

  it("handles multi-word suburb", () => {
    expect(buildPropertyFolderName("1 Smith Road", "Upper Coomera", "QLD", "4209")).toBe(
      "1 Smith Road Upper Coomera QLD 4209",
    )
  })

  it("handles all-uppercase state", () => {
    expect(buildPropertyFolderName("10 Park Ave", "Melbourne", "VIC", "3000")).toBe(
      "10 Park Ave Melbourne VIC 3000",
    )
  })

  it("trims whitespace from each part", () => {
    expect(buildPropertyFolderName("  5 Oak Cres  ", "  Brisbane  ", "QLD", "  4000  ")).toBe(
      "5 Oak Cres Brisbane QLD 4000",
    )
  })
})
