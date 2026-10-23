import { describe, expect, it } from "vitest"

import { isDialablePhone, normalizePhoneDigits } from "./google-contact-dialable"

describe("normalizePhoneDigits", () => {
  it("strips non-digits", () => {
    expect(normalizePhoneDigits("+61 400 111 222")).toBe("61400111222")
  })

  it("returns empty for whitespace", () => {
    expect(normalizePhoneDigits("   ")).toBe("")
  })
})

describe("isDialablePhone", () => {
  it("accepts typical AU mobile", () => {
    expect(isDialablePhone("0400 111 222")).toBe(true)
  })

  it("rejects too few digits", () => {
    expect(isDialablePhone("12345")).toBe(false)
  })

  it("rejects non-phone text", () => {
    expect(isDialablePhone("call me anytime")).toBe(false)
  })
})
