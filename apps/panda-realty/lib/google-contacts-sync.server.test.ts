import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/gmail-client", () => ({
  getGmailAccessToken: vi.fn(),
}))

vi.mock("@/lib/google-contacts-client", () => ({
  upsertGoogleContact: vi.fn(),
}))

vi.mock("@/lib/google-contact-property-context", () => ({
  formatGoogleContactPropertyContext: vi.fn(),
}))

vi.mock("@/lib/google-contacts-entity-addresses.server", () => ({
  fetchStreetAddressesForEntity: vi.fn(),
  loadEntityMembersForGoogleSync: vi.fn(),
  loadEntityRowForGoogleSync: vi.fn(),
}))

vi.mock("@/lib/google-contacts-sync-audit.server", () => ({
  applyGoogleContactsSyncAuditBatch: vi.fn(),
}))

import { getGmailAccessToken } from "@/lib/gmail-client"
import { formatGoogleContactPropertyContext } from "@/lib/google-contact-property-context"
import { upsertGoogleContact } from "@/lib/google-contacts-client"
import {
  fetchStreetAddressesForEntity,
  loadEntityMembersForGoogleSync,
  loadEntityRowForGoogleSync,
} from "@/lib/google-contacts-entity-addresses.server"
import { applyGoogleContactsSyncAuditBatch } from "@/lib/google-contacts-sync-audit.server"
import { syncEntityToGoogleContacts } from "@/lib/google-contacts-sync.server"

describe("syncEntityToGoogleContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("upserts second member without email when two members share the same email address", async () => {
    vi.mocked(getGmailAccessToken).mockResolvedValue("token")
    vi.mocked(loadEntityRowForGoogleSync).mockResolvedValue({
      entityId: 169955,
      entityName: "Chris & Merilyn Matthews",
      emailAddress: "mimruby@gmail.com",
      phoneNumber: "0419665682",
      entityCategorySlug: "buyer",
    })
    vi.mocked(fetchStreetAddressesForEntity).mockResolvedValue(["28 RIDGEGARDEN DRIVE MORAYFIELD"])
    vi.mocked(formatGoogleContactPropertyContext).mockReturnValue("28 RIDGEGARDEN DRIVE MORAYFIELD")
    vi.mocked(loadEntityMembersForGoogleSync).mockResolvedValue([
      {
        entityMemberId: 2988,
        memberName: "CHRISTOPHER WILLIAM MATTHEWS",
        memberEmailAddress: "MIMRUBY@GMAIL.COM",
        memberPhoneNumber: "0419665682",
        isBuyersRepresentative: false,
        parentEntityCategorySlug: "buyer",
      },
      {
        entityMemberId: 2989,
        memberName: "MERILYN ISABEL MATTHEWS",
        memberEmailAddress: "MIMRUBY@GMAIL.COM",
        memberPhoneNumber: "0438347078",
        isBuyersRepresentative: false,
        parentEntityCategorySlug: "buyer",
      },
    ])
    vi.mocked(upsertGoogleContact).mockResolvedValue("updated")
    vi.mocked(applyGoogleContactsSyncAuditBatch).mockResolvedValue(undefined)

    const warnings = await syncEntityToGoogleContacts(169955)

    expect(warnings).toEqual([])
    // 3 calls: entity + Christopher (with email) + Merilyn (phone-only, no email)
    expect(upsertGoogleContact).toHaveBeenCalledTimes(3)

    const christopherCall = vi.mocked(upsertGoogleContact).mock.calls[1]?.[1]
    expect(christopherCall).toMatchObject({
      entityName: "CHRISTOPHER WILLIAM MATTHEWS",
      emailAddress: "MIMRUBY@GMAIL.COM",
      phoneNumber: "0419665682",
    })

    const merylynCall = vi.mocked(upsertGoogleContact).mock.calls[2]?.[1]
    expect(merylynCall).toMatchObject({
      entityName: "MERILYN ISABEL MATTHEWS",
      phoneNumber: "0438347078",
    })
    expect(merylynCall?.emailAddress).toBeUndefined()
  })

  it("syncs contact members as 'Member Name (Company Name)' without Buyer Rep labeling", async () => {
    vi.mocked(getGmailAccessToken).mockResolvedValue("token")
    vi.mocked(loadEntityRowForGoogleSync).mockResolvedValue({
      entityId: 88,
      entityName: "Vantage Caboolture Riverfront",
      emailAddress: "contact@vantage.com.au",
      phoneNumber: "0733334444",
      entityCategorySlug: "contact",
    })
    vi.mocked(fetchStreetAddressesForEntity).mockResolvedValue(["12/176 TORRENS ROAD"])
    vi.mocked(formatGoogleContactPropertyContext).mockReturnValue("12/176 TORRENS ROAD")
    vi.mocked(loadEntityMembersForGoogleSync).mockResolvedValue([
      {
        entityMemberId: 1,
        memberName: "Sarah Sheridan",
        memberEmailAddress: "contractadmin@avid.com.au",
        memberPhoneNumber: "0458 550 540",
        isBuyersRepresentative: false,
        parentEntityCategorySlug: "contact",
      },
    ])
    vi.mocked(upsertGoogleContact).mockResolvedValue("updated")
    vi.mocked(applyGoogleContactsSyncAuditBatch).mockResolvedValue(undefined)

    const warnings = await syncEntityToGoogleContacts(88)

    expect(warnings).toEqual([])
    expect(upsertGoogleContact).toHaveBeenCalledTimes(2)
    expect(vi.mocked(upsertGoogleContact).mock.calls[1]?.[1]).toMatchObject({
      entityName: "Sarah Sheridan (Vantage Caboolture Riverfront)",
      emailAddress: "contractadmin@avid.com.au",
      phoneNumber: "0458 550 540",
      propertyAddress: "12/176 TORRENS ROAD",
      propertyRole: "omit",
    })
  })
})
