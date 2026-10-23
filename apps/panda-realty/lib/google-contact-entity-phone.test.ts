import { describe, expect, it } from "vitest"

import { resolveEntityPhoneForGoogleSync } from "./google-contact-entity-phone"

describe("resolveEntityPhoneForGoogleSync", () => {
  it("returns contact when dialable", () => {
    expect(resolveEntityPhoneForGoogleSync("0466275112", [])).toBe("0466275112")
  })

  it("falls back to first dialable member phone when contact is absent", () => {
    expect(resolveEntityPhoneForGoogleSync(null, ["not-a-phone", "0422999888"])).toBe("0422999888")
  })

  it("skips non-dialable member phones before returning the first dialable one", () => {
    expect(
      resolveEntityPhoneForGoogleSync(null, ["abc", "xyz", "0433111222"]),
    ).toBe("0433111222")
  })

  it("returns undefined when contact is non-dialable and no member has a dialable phone", () => {
    expect(resolveEntityPhoneForGoogleSync("see email", [])).toBeUndefined()
  })

  it("returns undefined when all fields are null", () => {
    expect(resolveEntityPhoneForGoogleSync(null, [])).toBeUndefined()
  })

  it("trims whitespace before checking dialability", () => {
    expect(resolveEntityPhoneForGoogleSync("  0466275112  ", [])).toBe("0466275112")
  })

  it("returns member phone when contact is whitespace-only", () => {
    expect(resolveEntityPhoneForGoogleSync("   ", ["0411222333"])).toBe("0411222333")
  })
})
