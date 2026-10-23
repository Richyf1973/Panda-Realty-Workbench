import { describe, expect, it } from "vitest"

import { resolveSellerPrimaryOwner } from "./seller-primary-owner"

const base = {
  owner1email: null,
  owner1name: null,
  owner2email: null,
  owner2name: null,
  owner3email: null,
  owner3name: null,
  primaryEmailOwnerNum: 1,
}

describe("resolveSellerPrimaryOwner", () => {
  it("picks the owner named by primaryEmailOwnerNum", () => {
    expect(
      resolveSellerPrimaryOwner({
        ...base,
        owner1email: "one@x.com",
        owner1name: "One",
        owner2email: "two@x.com",
        owner2name: "Two",
        primaryEmailOwnerNum: 2,
      }),
    ).toEqual({ email: "two@x.com", name: "Two" })
  })

  it("falls back to the first owner with an email when the primary has none", () => {
    expect(
      resolveSellerPrimaryOwner({
        ...base,
        owner2email: "two@x.com",
        owner2name: "Two",
        primaryEmailOwnerNum: 1,
      }),
    ).toEqual({ email: "two@x.com", name: "Two" })
  })

  it("defaults to owner 1 when primaryEmailOwnerNum is null", () => {
    expect(
      resolveSellerPrimaryOwner({ ...base, owner1email: "one@x.com", owner1name: "One", primaryEmailOwnerNum: null }),
    ).toEqual({ email: "one@x.com", name: "One" })
  })

  it("returns null when no owner has an email", () => {
    expect(resolveSellerPrimaryOwner(base)).toBeNull()
  })

  it("returns email with null name when the chosen owner has no name", () => {
    expect(
      resolveSellerPrimaryOwner({ ...base, owner1email: "one@x.com", owner1name: null }),
    ).toEqual({ email: "one@x.com", name: null })
  })
})
