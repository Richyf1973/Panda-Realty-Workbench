import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/db", () => ({ db: { select: vi.fn() } }))
// Real @/db/schema is used (pure table defs, no DB connection) so query builders like
// eq(portalTokens.portalTokenId, ...) resolve real columns — matching the route-test pattern.
vi.mock("@/lib/gmail-client", () => ({
  getConnectedGmailEmail: vi.fn(),
  getGmailAccessToken: vi.fn(),
  sendGmailMessage: vi.fn(),
}))

import { db } from "@/db"
import { getConnectedGmailEmail, getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
// buildPortalAdminUrl, buildPortalMessageAdminUrl, and resolveEffectiveOrigin are
// pure helpers extracted from portal-notifications.ts as part of this fix.
// AGENT_NOTIFICATION_EMAIL, buildPortalClientUrl, buildAgentMessageEmail,
// resolveAgentMessageRecipient, and sendAgentMessageNotification are added by the
// two-way notification work (spec: panda-email-notification-delivery-verify).
import {
  AGENT_NOTIFICATION_EMAIL,
  buildAgentMessageEmail,
  buildPortalAdminUrl,
  buildPortalClientUrl,
  buildPortalMessageAdminUrl,
  resolveAgentMessageRecipient,
  resolveEffectiveOrigin,
  sendAgentMessageNotification,
  sendPortalMessageNotification,
  sendPortalUploadNotification,
} from "./portal-notifications"

const ADMIN_INBOX = "admin@mypandarealty.com.au"

/** Build a fresh drizzle-select chain whose `.limit()` resolves the queued rows in order. */
function selectChainReturning(...rows: unknown[][]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  }
  for (const r of rows) chain.limit.mockResolvedValueOnce(r)
  return chain
}

// Both builders now open the property's Edit dialog via the shared `openEdit=<propertyListId>`
// param. Previously they linked to /admin/property-entities/<entityId>, a route that 404s.
describe("buildPortalAdminUrl", () => {
  it("opens the property dialog via openEdit when propertyListId is provided", () => {
    expect(buildPortalAdminUrl("https://panda-realty.vercel.app", 42)).toBe(
      "https://panda-realty.vercel.app/admin/properties?openEdit=42",
    )
  })

  it("falls back to /admin/properties when propertyListId is null", () => {
    expect(buildPortalAdminUrl("https://panda-realty.vercel.app", null)).toBe(
      "https://panda-realty.vercel.app/admin/properties",
    )
  })

  it("works with a dev localhost origin", () => {
    expect(buildPortalAdminUrl("http://localhost:3004", 7)).toBe(
      "http://localhost:3004/admin/properties?openEdit=7",
    )
  })
})

describe("buildPortalMessageAdminUrl", () => {
  it("opens the property dialog and the buyer's messages thread (with entity id)", () => {
    expect(
      buildPortalMessageAdminUrl("https://panda-realty.vercel.app", {
        propertyListId: 99,
        propertyEntityId: 42,
        role: "buyer",
      }),
    ).toBe("https://panda-realty.vercel.app/admin/properties?openEdit=99&openMessages=buyer&openMessagesEntity=42")
  })

  it("opens the property dialog and the seller's messages thread", () => {
    expect(
      buildPortalMessageAdminUrl("https://panda-realty.vercel.app", {
        propertyListId: 99,
        propertyEntityId: null,
        role: "seller",
      }),
    ).toBe("https://panda-realty.vercel.app/admin/properties?openEdit=99&openMessages=seller")
  })

  it("falls back to /admin/properties when propertyListId is null", () => {
    expect(
      buildPortalMessageAdminUrl("https://panda-realty.vercel.app", {
        propertyListId: null,
        propertyEntityId: null,
        role: "buyer",
      }),
    ).toBe("https://panda-realty.vercel.app/admin/properties")
  })

  it("works with a dev localhost origin", () => {
    expect(
      buildPortalMessageAdminUrl("http://localhost:3004", {
        propertyListId: 7,
        propertyEntityId: 3,
        role: "buyer",
      }),
    ).toBe("http://localhost:3004/admin/properties?openEdit=7&openMessages=buyer&openMessagesEntity=3")
  })
})

describe("resolveEffectiveOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns NEXT_PUBLIC_APP_URL when it is set, ignoring requestOrigin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://custom-domain.com")
    expect(resolveEffectiveOrigin("http://localhost:3004")).toBe("https://custom-domain.com")
  })

  it("returns requestOrigin when NEXT_PUBLIC_APP_URL is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    expect(resolveEffectiveOrigin("https://panda-realty.vercel.app")).toBe(
      "https://panda-realty.vercel.app",
    )
  })

  it("returns requestOrigin when NEXT_PUBLIC_APP_URL is undefined", () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(resolveEffectiveOrigin("https://panda-realty.vercel.app")).toBe(
      "https://panda-realty.vercel.app",
    )
  })
})

// ── Two-way notification work (spec: panda-email-notification-delivery-verify) ──

describe("AGENT_NOTIFICATION_EMAIL", () => {
  it("is the single admin inbox all inbound alerts go to", () => {
    expect(AGENT_NOTIFICATION_EMAIL).toBe(ADMIN_INBOX)
  })
})

describe("buildPortalClientUrl", () => {
  it("returns the buyer portal path for a buyer token", () => {
    expect(buildPortalClientUrl("https://app.test", { role: "buyer", token: "tok-b" })).toBe(
      "https://app.test/portal/tok-b",
    )
  })

  it("returns the seller portal path for a seller token", () => {
    expect(buildPortalClientUrl("https://app.test", { role: "seller", token: "tok-s" })).toBe(
      "https://app.test/portal/seller/tok-s",
    )
  })
})

describe("buildAgentMessageEmail (outbound payload)", () => {
  it("includes the message text and a button linking to the client portal", () => {
    const { subject, bodyHtml } = buildAgentMessageEmail({
      clientName: "Jane Buyer",
      propertyAddress: "10 Test St, Brisbane",
      messageBody: "Please review the contract",
      portalUrl: "https://app.test/portal/tok-b",
    })
    expect(subject).toContain("10 Test St, Brisbane")
    expect(bodyHtml).toContain("Please review the contract")
    expect(bodyHtml).toContain("https://app.test/portal/tok-b")
  })

  it("escapes HTML in the message body", () => {
    const { bodyHtml } = buildAgentMessageEmail({
      clientName: "X",
      propertyAddress: "Y",
      messageBody: "<script>alert(1)</script>",
      portalUrl: "https://app.test/portal/t",
    })
    expect(bodyHtml).not.toContain("<script>alert(1)</script>")
    expect(bodyHtml).toContain("&lt;script&gt;")
  })
})

describe("resolveAgentMessageRecipient (pure)", () => {
  it("buyer token: uses the entity email + name", () => {
    const recipient = resolveAgentMessageRecipient({
      tokenRow: { role: "buyer" },
      entity: { emailAddress: "buyer@x.com", entityName: "Jane Buyer" },
      property: null,
    })
    expect(recipient).toEqual({ email: "buyer@x.com", name: "Jane Buyer" })
  })

  it("seller token: uses the primary owner email selected by primaryEmailOwnerNum", () => {
    const recipient = resolveAgentMessageRecipient({
      tokenRow: { role: "seller" },
      entity: null,
      property: {
        streetAddress: "5 Owner Rd",
        suburb: "Logan",
        owner1email: "owner1@x.com",
        owner1name: "First Owner",
        owner2email: "owner2@x.com",
        owner2name: "Second Owner",
        owner3email: null,
        owner3name: null,
        primaryEmailOwnerNum: 2,
      },
    })
    expect(recipient).toEqual({ email: "owner2@x.com", name: "Second Owner" })
  })

  it("seller token: falls back to the first non-empty owner email when primary has none", () => {
    const recipient = resolveAgentMessageRecipient({
      tokenRow: { role: "seller" },
      entity: null,
      property: {
        streetAddress: "5 Owner Rd",
        suburb: "Logan",
        owner1email: null,
        owner1name: null,
        owner2email: "owner2@x.com",
        owner2name: "Second Owner",
        owner3email: null,
        owner3name: null,
        primaryEmailOwnerNum: 1,
      },
    })
    expect(recipient?.email).toBe("owner2@x.com")
  })

  it("returns null when the client has no email on record", () => {
    const recipient = resolveAgentMessageRecipient({
      tokenRow: { role: "buyer" },
      entity: { emailAddress: null, entityName: "Jane Buyer" },
      property: null,
    })
    expect(recipient).toBeNull()
  })
})

describe("sendPortalMessageNotification (inbound: client -> admin)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getGmailAccessToken).mockResolvedValue("tok-access")
    vi.mocked(getConnectedGmailEmail).mockResolvedValue("connected-account@gmail.com")
    vi.mocked(sendGmailMessage).mockResolvedValue({ threadId: "t1" })
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChainReturning([{ streetAddress: "10 Test St", suburb: "Brisbane" }]) as never)
      .mockReturnValueOnce(selectChainReturning([{ entityId: 5 }]) as never)
      .mockReturnValueOnce(selectChainReturning([{ entityName: "Jane Buyer" }]) as never)
  })

  it("sends to admin@mypandarealty.com.au, not the connected Gmail account", async () => {
    await sendPortalMessageNotification(
      { portalTokenId: 1, propertyEntityId: 7, propertyListId: 3, role: "buyer" },
      "Inbound test 1",
      "https://app.test",
    )
    expect(sendGmailMessage).toHaveBeenCalledTimes(1)
    const [, to, subject, bodyHtml] = vi.mocked(sendGmailMessage).mock.calls[0]
    expect(to).toBe(ADMIN_INBOX)
    expect(to).not.toBe("connected-account@gmail.com")
    expect(subject).toContain("Jane Buyer")
    expect(subject).toContain("10 Test St, Brisbane")
    expect(bodyHtml).toContain("Inbound test 1")
  })

  it("no-ops without sending when Gmail is not connected", async () => {
    vi.mocked(getGmailAccessToken).mockRejectedValue(new Error("Gmail not connected"))
    await sendPortalMessageNotification(
      { portalTokenId: 1, propertyEntityId: 7, propertyListId: 3, role: "buyer" },
      "Inbound test 2",
      "https://app.test",
    )
    expect(sendGmailMessage).not.toHaveBeenCalled()
  })
})

describe("sendPortalUploadNotification (inbound upload: client -> admin)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getGmailAccessToken).mockResolvedValue("tok-access")
    vi.mocked(getConnectedGmailEmail).mockResolvedValue("connected-account@gmail.com")
    vi.mocked(sendGmailMessage).mockResolvedValue({ threadId: "t1" })
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChainReturning([{ streetAddress: "10 Test St", suburb: "Brisbane" }]) as never)
      .mockReturnValueOnce(selectChainReturning([{ entityId: 5 }]) as never)
      .mockReturnValueOnce(selectChainReturning([{ entityName: "Jane Buyer" }]) as never)
  })

  it("sends the upload alert to admin@mypandarealty.com.au", async () => {
    await sendPortalUploadNotification(
      { portalTokenId: 1, propertyEntityId: 7, propertyListId: 3, role: "buyer" },
      "contract.pdf",
      "buyer",
      "https://app.test",
    )
    expect(sendGmailMessage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendGmailMessage).mock.calls[0][1]).toBe(ADMIN_INBOX)
  })
})

describe("sendAgentMessageNotification (outbound: agent -> client)", () => {
  const sellerlessProperty = {
    streetAddress: "10 Test St",
    suburb: "Brisbane",
    owner1email: null,
    owner1name: null,
    owner2email: null,
    owner2name: null,
    owner3email: null,
    owner3name: null,
    primaryEmailOwnerNum: 1,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getGmailAccessToken).mockResolvedValue("tok-access")
    vi.mocked(sendGmailMessage).mockResolvedValue({ threadId: "t1" })
  })

  it("buyer: sends to the buyer entity email with a /portal/<token> link", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        selectChainReturning([
          { token: "tok-buyer", role: "buyer", propertyEntityId: 7, propertyListId: 3, revokedAt: null },
        ]) as never,
      )
      .mockReturnValueOnce(selectChainReturning([sellerlessProperty]) as never)
      .mockReturnValueOnce(
        selectChainReturning([{ emailAddress: "buyer@x.com", entityName: "Jane Buyer" }]) as never,
      )

    await sendAgentMessageNotification(1, "Outbound test 1", "https://app.test")

    expect(sendGmailMessage).toHaveBeenCalledTimes(1)
    const [, to, , bodyHtml] = vi.mocked(sendGmailMessage).mock.calls[0]
    expect(to).toBe("buyer@x.com")
    expect(to).not.toBe(ADMIN_INBOX)
    expect(bodyHtml).toContain("Outbound test 1")
    expect(bodyHtml).toContain("https://app.test/portal/tok-buyer")
  })

  it("seller: sends to the primary owner email with a /portal/seller/<token> link", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        selectChainReturning([
          { token: "tok-seller", role: "seller", propertyEntityId: null, propertyListId: 9, revokedAt: null },
        ]) as never,
      )
      .mockReturnValueOnce(
        selectChainReturning([
          {
            streetAddress: "5 Owner Rd",
            suburb: "Logan",
            owner1email: "seller@x.com",
            owner1name: "Sam Seller",
            owner2email: null,
            owner2name: null,
            owner3email: null,
            owner3name: null,
            primaryEmailOwnerNum: 1,
          },
        ]) as never,
      )

    await sendAgentMessageNotification(2, "Outbound seller test", "https://app.test")

    expect(sendGmailMessage).toHaveBeenCalledTimes(1)
    const [, to, , bodyHtml] = vi.mocked(sendGmailMessage).mock.calls[0]
    expect(to).toBe("seller@x.com")
    expect(bodyHtml).toContain("https://app.test/portal/seller/tok-seller")
  })

  it("does not send when the client has no email on record", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(
        selectChainReturning([
          { token: "tok-buyer", role: "buyer", propertyEntityId: 7, propertyListId: 3, revokedAt: null },
        ]) as never,
      )
      .mockReturnValueOnce(selectChainReturning([sellerlessProperty]) as never)
      .mockReturnValueOnce(selectChainReturning([{ emailAddress: null, entityName: "Jane Buyer" }]) as never)

    await sendAgentMessageNotification(1, "Outbound no-email", "https://app.test")
    expect(sendGmailMessage).not.toHaveBeenCalled()
  })

  it("no-ops without sending when Gmail is not connected", async () => {
    vi.mocked(getGmailAccessToken).mockRejectedValue(new Error("Gmail not connected"))
    vi.mocked(db.select)
      .mockReturnValueOnce(
        selectChainReturning([
          { token: "tok-buyer", role: "buyer", propertyEntityId: 7, propertyListId: 3, revokedAt: null },
        ]) as never,
      )
      .mockReturnValueOnce(selectChainReturning([sellerlessProperty]) as never)
      .mockReturnValueOnce(
        selectChainReturning([{ emailAddress: "buyer@x.com", entityName: "Jane Buyer" }]) as never,
      )

    await sendAgentMessageNotification(1, "Outbound test", "https://app.test")
    expect(sendGmailMessage).not.toHaveBeenCalled()
  })
})
