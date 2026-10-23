import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn() }))
vi.mock("@/lib/gmail-client", () => ({
  getGmailAccessToken: vi.fn(),
  sendGmailMessage: vi.fn(),
}))
vi.mock("@/lib/offer-form-token.server", () => ({ getOrCreateOfferFormToken: vi.fn() }))
vi.mock("@/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }))

import { getSessionUser } from "@/lib/auth/session"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import { getOrCreateOfferFormToken } from "@/lib/offer-form-token.server"
import { db } from "@/db"

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/property-forms/send-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/admin/property-forms/send-link", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getSessionUser).mockResolvedValue({ userId: 1 } as never)
    vi.mocked(getGmailAccessToken).mockResolvedValue("token-123")
    vi.mocked(sendGmailMessage).mockResolvedValue({ threadId: "t1" })
    vi.mocked(getOrCreateOfferFormToken).mockResolvedValue({ token: "uuid-abc" } as never)
    const selectChain = { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn() }
    const insertChain = { values: vi.fn().mockResolvedValue(undefined) }
    vi.mocked(db.select).mockReturnValue(selectChain as never)
    vi.mocked(db.insert).mockReturnValue(insertChain as never)
    selectChain.limit
      .mockResolvedValueOnce([{ streetAddress: "10 Test St", suburb: "Brisbane" }]) // property
      .mockResolvedValueOnce([{ entityId: 5 }])                                      // propertyEntity
      .mockResolvedValueOnce([{ entityName: "John Doe", emailAddress: "john@test.com" }]) // entity
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    const res = await POST(makeRequest({ propertyFormId: 1, propertyListId: 2, propertyEntityIds: [10] }))
    expect(res.status).toBe(401)
  })

  it("returns 422 when propertyEntityIds is empty", async () => {
    const res = await POST(makeRequest({ propertyFormId: 1, propertyListId: 2, propertyEntityIds: [] }))
    expect(res.status).toBe(422)
  })

  it("returns 503 when Gmail is not connected", async () => {
    vi.mocked(getGmailAccessToken).mockRejectedValue(new Error("Gmail not connected"))
    const res = await POST(makeRequest({ propertyFormId: 1, propertyListId: 2, propertyEntityIds: [10] }))
    expect(res.status).toBe(503)
  })

  it("sends email and returns sent count", async () => {
    const res = await POST(makeRequest({ propertyFormId: 1, propertyListId: 2, propertyEntityIds: [10] }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.sent).toBe(1)
    expect(data.failures).toHaveLength(0)
    expect(vi.mocked(db.insert).mock.results[0]?.value.values).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 5 })
    )
    expect(sendGmailMessage).toHaveBeenCalledWith(
      "token-123",
      "john@test.com",
      "Offer Form — 10 Test St, Brisbane",
      expect.stringContaining("/offer-form/uuid-abc"),
    )
  })
})
