import { describe, expect, it } from "vitest"

import { encodeHeaderValue } from "./gmail-send"

describe("encodeHeaderValue", () => {
  it("passes ASCII-only strings through unchanged", () => {
    expect(encodeHeaderValue("Offer Form")).toBe("Offer Form")
  })

  it("passes ASCII subject with commas and spaces through unchanged", () => {
    expect(encodeHeaderValue("Offer Form 54 Bsty drive, Caboolture")).toBe(
      "Offer Form 54 Bsty drive, Caboolture",
    )
  })

  it("encodes subject containing an em dash using RFC 2047 base64", () => {
    const result = encodeHeaderValue("Offer Form — 54 Bsty drive, Caboolture")
    expect(result).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/]+=*\?=$/)
    const match = result.match(/^=\?UTF-8\?B\?([A-Za-z0-9+/]+=*)\?=$/)
    expect(match).not.toBeNull()
    const decoded = Buffer.from(match![1], "base64").toString("utf8")
    expect(decoded).toBe("Offer Form — 54 Bsty drive, Caboolture")
  })

  it("encodes subject with buyer name and address both separated by em dashes", () => {
    const result = encodeHeaderValue(
      "Offer Form — Test Buyer — 54 Bsty drive, Caboolture",
    )
    expect(result).toMatch(/^=\?UTF-8\?B\?/)
    const match = result.match(/^=\?UTF-8\?B\?([A-Za-z0-9+/]+=*)\?=$/)!
    const decoded = Buffer.from(match[1], "base64").toString("utf8")
    expect(decoded).toBe("Offer Form — Test Buyer — 54 Bsty drive, Caboolture")
  })

  it("encodes subject with accented characters in buyer name", () => {
    const result = encodeHeaderValue("Offer Form — José García — 54 Bsty drive")
    expect(result).toMatch(/^=\?UTF-8\?B\?/)
    const match = result.match(/^=\?UTF-8\?B\?([A-Za-z0-9+/]+=*)\?=$/)!
    const decoded = Buffer.from(match[1], "base64").toString("utf8")
    expect(decoded).toBe("Offer Form — José García — 54 Bsty drive")
  })

  it("returns empty string unchanged", () => {
    expect(encodeHeaderValue("")).toBe("")
  })
})
