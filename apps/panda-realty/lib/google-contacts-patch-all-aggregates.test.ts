import { describe, expect, it } from "vitest"

import {
  buildBulkGoogleContactsAggregates,
  mergePhoneContributorsIntoEmailAgg,
  ownerRefMapKey,
} from "@/lib/google-contacts-patch-all-aggregates.server"
import type {
  EmailAggWithContributors,
  PhoneOnlyAggWithContributors,
} from "@/lib/google-contacts-patch-all-aggregates.types"
import type { EntityMemberBulkRow } from "@/lib/google-contacts-bulk-addresses.server"

function emptyEmailAgg(): EmailAggWithContributors {
  return {
    canonicalEmail: "x@test.com",
    entityName: "X",
    propertyRole: "enquiry",
    streets: [],
    fromEntity: true,
    fromOwner: false,
    contributingEntityIds: new Set([1]),
    contributingOwners: new Map(),
  }
}

function samplePhoneAgg(): PhoneOnlyAggWithContributors {
  const ref = { propertyListId: 42, slot: 2 as const }
  return {
    normalizedDigits: "0412345678",
    displayPhone: "0412345678",
    entityName: "Y",
    propertyRole: "seller",
    streets: [],
    fromEntity: true,
    fromOwner: true,
    contributingEntityIds: new Set([7, 8]),
    contributingOwners: new Map([[ownerRefMapKey(ref), ref]]),
  }
}

function makeRep(overrides: Partial<EntityMemberBulkRow> = {}): EntityMemberBulkRow {
  return {
    entityMemberId: 99,
    entityId: 10,
    entityName: "JULENE ENID KELLS",
    entityCategorySlug: "buyer",
    memberName: "Nadia - Daughter",
    memberEmailAddress: "nadia@example.com",
    memberPhoneNumber: "0422724397",
    isBuyersRepresentative: true,
    streetAddress: "180/46 Amy Street",
    ...overrides,
  }
}

function makeContactMember(overrides: Partial<EntityMemberBulkRow> = {}): EntityMemberBulkRow {
  return {
    entityMemberId: 101,
    entityId: 22,
    entityName: "Vantage Caboolture Riverfront",
    entityCategorySlug: "contact",
    memberName: "Sarah Sheridan",
    memberEmailAddress: "sarah@example.com",
    memberPhoneNumber: "0458550540",
    isBuyersRepresentative: false,
    streetAddress: "12/176 TORRENS ROAD",
    ...overrides,
  }
}

describe("buildBulkGoogleContactsAggregates - rep rows", () => {
  it("places rep with email into byRepEmail, not byEmail", () => {
    const { byEmail, byRepEmail } = buildBulkGoogleContactsAggregates([], [], [makeRep()])
    expect(byEmail.size).toBe(0)
    const agg = byRepEmail.get("nadia@example.com")
    expect(agg).toBeDefined()
    expect(agg!.entityName).toBe("Nadia - Daughter (rep for JULENE ENID KELLS)")
    expect(agg!.propertyRole).toBe("buyer-rep")
    expect(agg!.canonicalEmail).toBe("nadia@example.com")
    expect(agg!.phoneNumber).toBe("0422724397")
    expect(agg!.streets).toContain("180/46 Amy Street")
    expect([...agg!.contributingEntityIds]).toContain(10)
  })

  it("places rep with no email into byRepPhoneOnly, not byPhoneOnly", () => {
    const { byPhoneOnly, byRepPhoneOnly } = buildBulkGoogleContactsAggregates(
      [],
      [],
      [makeRep({ memberEmailAddress: undefined })],
    )
    expect(byPhoneOnly.size).toBe(0)
    expect(byRepPhoneOnly.size).toBe(1)
    const agg = [...byRepPhoneOnly.values()][0]!
    expect(agg.entityName).toBe("Nadia - Daughter (rep for JULENE ENID KELLS)")
    expect(agg.propertyRole).toBe("buyer-rep")
  })

  it("keeps rep and entity in separate aggregates even when email is shared", () => {
    const entityRow = {
      entityId: 5,
      entityName: "JULENE ENID KELLS",
      emailAddress: "nadia@example.com",
      contact: null,
      streetAddress: "180/46 Amy Street",
      entityCategorySlug: "buyer",
    }
    const { byEmail, byRepEmail } = buildBulkGoogleContactsAggregates([entityRow], [], [makeRep()])
    expect(byEmail.size).toBe(1)
    expect(byEmail.get("nadia@example.com")!.entityName).toBe("JULENE ENID KELLS")
    expect(byRepEmail.size).toBe(1)
    expect(byRepEmail.get("nadia@example.com")!.entityName).toBe(
      "Nadia - Daughter (rep for JULENE ENID KELLS)",
    )
  })

  it("formats contact members with company-name reference and no Buyer Rep role", () => {
    const memberRow = makeContactMember()
    const { byRepEmail } = buildBulkGoogleContactsAggregates([], [], [memberRow])

    const agg = byRepEmail.get("sarah@example.com")
    expect(agg).toBeDefined()
    expect(agg!.entityName).toBe("Sarah Sheridan (Vantage Caboolture Riverfront)")
    expect(agg!.propertyRole).toBe("omit")
    expect(agg!.phoneNumber).toBe("0458550540")
    expect(agg!.streets).toContain("12/176 TORRENS ROAD")
  })

  it("routes second member's phone to byRepPhoneOnly when two members share the same email", () => {
    const christopher: EntityMemberBulkRow = {
      entityMemberId: 2988,
      entityId: 169955,
      entityName: "Chris & Merilyn Matthews",
      entityCategorySlug: "buyer",
      memberName: "CHRISTOPHER WILLIAM MATTHEWS",
      memberEmailAddress: "MIMRUBY@GMAIL.COM",
      memberPhoneNumber: "0419665682",
      isBuyersRepresentative: false,
      streetAddress: "28 RIDGEGARDEN DRIVE MORAYFIELD",
    }
    const merilyn: EntityMemberBulkRow = {
      entityMemberId: 2989,
      entityId: 169955,
      entityName: "Chris & Merilyn Matthews",
      entityCategorySlug: "buyer",
      memberName: "MERILYN ISABEL MATTHEWS",
      memberEmailAddress: "MIMRUBY@GMAIL.COM",
      memberPhoneNumber: "0438347078",
      isBuyersRepresentative: false,
      streetAddress: "28 RIDGEGARDEN DRIVE MORAYFIELD",
    }

    const { byRepEmail, byRepPhoneOnly } = buildBulkGoogleContactsAggregates([], [], [christopher, merilyn])

    // First member gets the email-keyed entry
    expect(byRepEmail.size).toBe(1)
    const emailAgg = byRepEmail.get("mimruby@gmail.com")
    expect(emailAgg).toBeDefined()
    expect(emailAgg!.entityName).toBe("CHRISTOPHER WILLIAM MATTHEWS")
    expect(emailAgg!.phoneNumber).toBe("0419665682")

    // Second member's phone is routed to byRepPhoneOnly, not dropped
    expect(byRepPhoneOnly.size).toBe(1)
    const phoneAgg = [...byRepPhoneOnly.values()][0]!
    expect(phoneAgg.entityName).toBe("MERILYN ISABEL MATTHEWS")
    expect(phoneAgg.displayPhone).toBe("0438347078")
    expect(phoneAgg.normalizedDigits).toBe("0438347078")
  })

  it("does not double-count streets when two members share email and same street", () => {
    const member1: EntityMemberBulkRow = {
      entityMemberId: 2988,
      entityId: 169955,
      entityName: "Chris & Merilyn Matthews",
      entityCategorySlug: "buyer",
      memberName: "CHRISTOPHER WILLIAM MATTHEWS",
      memberEmailAddress: "shared@example.com",
      memberPhoneNumber: "0419665682",
      isBuyersRepresentative: false,
      streetAddress: "28 RIDGEGARDEN DRIVE",
    }
    const member2: EntityMemberBulkRow = {
      ...member1,
      entityMemberId: 2989,
      memberName: "MERILYN ISABEL MATTHEWS",
      memberPhoneNumber: "0438347078",
    }

    const { byRepEmail } = buildBulkGoogleContactsAggregates([], [], [member1, member2])
    const emailAgg = byRepEmail.get("shared@example.com")
    // street should appear only once in the email-keyed entry (second member's same street is still merged)
    expect(emailAgg!.streets.filter((s) => s === "28 RIDGEGARDEN DRIVE").length).toBe(1)
  })
})

describe("mergePhoneContributorsIntoEmailAgg", () => {
  it("merges entity ids and owner refs from phone bucket into email aggregate", () => {
    const email = emptyEmailAgg()
    const phone = samplePhoneAgg()
    mergePhoneContributorsIntoEmailAgg(email, phone)

    expect([...email.contributingEntityIds].sort((a, b) => a - b)).toEqual([1, 7, 8])
    expect(email.contributingOwners.size).toBe(1)
    expect(email.contributingOwners.get("42-2")).toEqual({ propertyListId: 42, slot: 2 })
    expect(email.propertyRole).toBe("seller")
  })
})
