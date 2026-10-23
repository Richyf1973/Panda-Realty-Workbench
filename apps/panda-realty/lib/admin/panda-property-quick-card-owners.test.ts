import { describe, expect, it } from "vitest"

import { getPandaPropertyQuickCardOwners } from "./panda-property-quick-card-owners"

describe("getPandaPropertyQuickCardOwners", () => {
  it("returns one row per non-empty owner slot with trimmed contact values", () => {
    expect(
      getPandaPropertyQuickCardOwners({
        owner1name: " JEFFREY RONALD WATT ",
        owner1phone: " 0417375738 ",
        owner1email: " j_jwatt@bigpond.com ",
        owner2name: "JANIS MERLE WATT",
        owner2phone: " ",
        owner2email: null,
        owner3name: "",
        owner3phone: "0400000000",
        owner3email: "owner3@example.com",
      }),
    ).toEqual([
      {
        ownerNum: 1,
        name: "JEFFREY RONALD WATT",
        phone: "0417375738",
        email: "j_jwatt@bigpond.com",
      },
      {
        ownerNum: 2,
        name: "JANIS MERLE WATT",
        phone: null,
        email: null,
      },
    ])
  })

  it("returns an empty list when all owner names are blank", () => {
    expect(
      getPandaPropertyQuickCardOwners({
        owner1name: " ",
        owner1phone: "0417375738",
        owner1email: "owner1@example.com",
        owner2name: null,
        owner2phone: null,
        owner2email: null,
        owner3name: "",
        owner3phone: "",
        owner3email: "",
      }),
    ).toEqual([])
  })
})
