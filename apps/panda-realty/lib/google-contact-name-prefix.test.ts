import { describe, expect, it } from "vitest"

import {
  buildGoogleContactsDisplayName,
  entityCategorySlugToPropertyRole,
  maxPropertyRole,
  propertyRoleRank,
} from "@/lib/google-contact-name-prefix"

describe("entityCategorySlugToPropertyRole", () => {
  it("maps known slugs (case-insensitive)", () => {
    expect(entityCategorySlugToPropertyRole("buyer")).toBe("enquiry")
    expect(entityCategorySlugToPropertyRole("Contact")).toBe("contact")
    expect(entityCategorySlugToPropertyRole("TENANT")).toBe("tenant")
    expect(entityCategorySlugToPropertyRole("seller")).toBe("seller")
  })

  it("returns omit for unknown or empty", () => {
    expect(entityCategorySlugToPropertyRole("landlord")).toBe("omit")
    expect(entityCategorySlugToPropertyRole("")).toBe("omit")
    expect(entityCategorySlugToPropertyRole(null)).toBe("omit")
    expect(entityCategorySlugToPropertyRole(undefined)).toBe("omit")
  })
})

describe("maxPropertyRole", () => {
  it("follows Seller > Contact > Tenant > Enq > omit", () => {
    expect(maxPropertyRole("omit", "enquiry")).toBe("enquiry")
    expect(maxPropertyRole("tenant", "contact")).toBe("contact")
    expect(maxPropertyRole("contact", "seller")).toBe("seller")
    expect(maxPropertyRole("enquiry", "seller")).toBe("seller")
    expect(propertyRoleRank("seller")).toBeGreaterThan(propertyRoleRank("contact"))
  })
})

describe("buildGoogleContactsDisplayName", () => {
  it("uses role labels when address present", () => {
    expect(
      buildGoogleContactsDisplayName({
        entityName: "Jane",
        propertyAddress: "1 Main St",
        propertyRole: "enquiry",
      }),
    ).toBe("Jane Enq: 1 Main St;")
    expect(
      buildGoogleContactsDisplayName({
        entityName: "Jane",
        propertyAddress: "1 Main St",
        propertyRole: "seller",
      }),
    ).toBe("Jane Seller: 1 Main St;")
  })

  it("omits role segment for unknown category (omit)", () => {
    expect(
      buildGoogleContactsDisplayName({
        entityName: "Pat",
        propertyAddress: "9 Oak Ave",
        propertyRole: "omit",
      }),
    ).toBe("Pat 9 Oak Ave;")
  })

  it("returns entity name only when no property address", () => {
    expect(
      buildGoogleContactsDisplayName({
        entityName: "Pat",
        propertyRole: "tenant",
      }),
    ).toBe("Pat")
  })

  it("appends dialable phone last", () => {
    expect(
      buildGoogleContactsDisplayName({
        entityName: "Pat",
        propertyAddress: "9 Oak Ave",
        phoneNumber: "0411999000",
        propertyRole: "tenant",
      }),
    ).toBe("Pat Tenant: 9 Oak Ave; 0411999000")
  })
})
