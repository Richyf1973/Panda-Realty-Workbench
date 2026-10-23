import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/db", () => ({
  db: { select: vi.fn(), transaction: vi.fn() },
}))

vi.mock("@/db/schema", () => ({
  offerFormTokens: {},
  propertyEntities: {},
  entities: {},
  entityMembers: {},
  buyerOffers: {},
  offerFormSubmissions: {},
  pandaProperties: {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  isNull: vi.fn(),
}))

vi.mock("@/lib/offer-form-pdf-on-submit", () => ({
  generateAndUploadOfferFormPdf: vi.fn().mockResolvedValue(null),
}))

vi.mock("./offer-form-notification", () => ({
  sendAgentNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("./offer-form-upsert", () => ({
  upsertBuyerOfferInTx: vi.fn().mockResolvedValue(undefined),
  upsertEntityMembersInTx: vi.fn().mockResolvedValue(undefined),
  upsertSolicitorInTx: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from "./route"
import { db } from "@/db"

afterEach(() => vi.clearAllMocks())

// Creates a chainable mock that behaves like a Drizzle query builder.
// Both `await chain` and `chain.limit(1).then(fn)` resolve to `rows`.
function makeChain(rows: unknown[]) {
  const p = Promise.resolve(rows)
  const chain: Record<string, unknown> = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => p,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  }
  return chain
}

function routeCtx(token: string) {
  return { params: Promise.resolve({ token }) }
}

// Shared fixture data used across GET tests
const TOKEN_ROW = { offerFormTokenId: 1, propertyEntityId: 10, propertyListId: 20, token: "abc" }
const PE_ROW = { entityId: 5 }
const ENTITY_ROW = {
  entityId: 5,
  entityName: "Smith Entity",
  emailAddress: "smith@example.com",
  contact: "0400000001",
  address: "1 Main St",
  esuburb: "Brisbane",
  epostcode: "4000",
}
const PROPERTY_ROW = { streetAddress: "100 Queen St", suburb: "Brisbane City", state: "QLD", postcode: "4000" }

// Sets up db.select to return values in the order the GET handler queries:
// 1. offerFormTokens  2. propertyEntities  3. entities  4. pandaProperties
// 5. entityMembers (non-rep)  6. entityMembers (rep)  7. offerFormSubmissions  8. buyerOffers
// 9. sellerSolicitor (propertyEntities innerJoin entities)
function setupGetSelectSequence({
  token = TOKEN_ROW,
  pe = PE_ROW,
  entity = ENTITY_ROW,
  property = PROPERTY_ROW,
  buyerMembers = [] as unknown[],
  repMember = null as unknown,
  submission = null as unknown,
  offer = null as unknown,
  sellerSolicitor = null as unknown,
} = {}) {
  const selectMock = vi.mocked(db.select)
  selectMock
    .mockReturnValueOnce(makeChain(token ? [token] : []) as never)
    .mockReturnValueOnce(makeChain(pe ? [pe] : []) as never)
    .mockReturnValueOnce(makeChain(entity ? [entity] : []) as never)
    .mockReturnValueOnce(makeChain(property ? [property] : []) as never)
    .mockReturnValueOnce(makeChain(buyerMembers) as never)
    .mockReturnValueOnce(makeChain(repMember ? [repMember] : []) as never)
    .mockReturnValueOnce(makeChain(submission ? [submission] : []) as never)
    .mockReturnValueOnce(makeChain(offer ? [offer] : []) as never)
    .mockReturnValueOnce(makeChain(sellerSolicitor ? [sellerSolicitor] : []) as never)
}

// ---------------------------------------------------------------------------
// POST — validation (no DB required; validation runs before token lookup)
// ---------------------------------------------------------------------------
describe("POST /api/offer-form/[token] — validation", () => {
  it("returns 400 when request body is not valid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/offer-form/abc", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "not json",
      }),
      routeCtx("abc"),
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid JSON" })
  })

  it("returns 422 when buyer1Name is empty", async () => {
    const res = await POST(
      new Request("http://localhost/api/offer-form/abc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyers: [{ name: "" }], buyer1Name: "", offerAmount: "500000" }),
      }),
      routeCtx("abc"),
    )
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/validation/i)
  })

  it("returns 422 when offerAmount is absent", async () => {
    const res = await POST(
      new Request("http://localhost/api/offer-form/abc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyers: [{ name: "Alice" }], buyer1Name: "Alice" }),
      }),
      routeCtx("abc"),
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 when solicitorEmail is not a valid email address", async () => {
    const res = await POST(
      new Request("http://localhost/api/offer-form/abc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyers: [{ name: "Alice" }],
          buyer1Name: "Alice",
          offerAmount: "500000",
          solicitorEmail: "not-an-email",
        }),
      }),
      routeCtx("abc"),
    )
    expect(res.status).toBe(422)
  })

  it("accepts an empty string for solicitorEmail (field is optional)", async () => {
    // Set up DB for the successful path: token found, transaction runs
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never)
    vi.mocked(db.transaction).mockImplementation(async (fn) => fn({} as never))
    const res = await POST(
      new Request("http://localhost/api/offer-form/abc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyers: [{ name: "Alice" }],
          buyer1Name: "Alice",
          offerAmount: "500000",
          solicitorEmail: "",
        }),
      }),
      routeCtx("abc"),
    )
    // Token not found → 404, but not a 422 (validation passed)
    expect(res.status).not.toBe(422)
  })
})

// ---------------------------------------------------------------------------
// GET — buyers fallback chain
// ---------------------------------------------------------------------------
describe("GET /api/offer-form/[token] — buyers fallback chain", () => {
  it("returns 404 when the token does not exist", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]) as never)
    const res = await GET(new Request("http://localhost/api/offer-form/unknown"), routeCtx("unknown"))
    expect(res.status).toBe(404)
  })

  it("populates buyers from entity_members rows when they exist", async () => {
    const buyerMembers = [
      { memberName: "Alice Smith", memberPhoneNumber: "0400000001", memberEmailAddress: "alice@example.com", memberAddress: "1 Main St" },
      { memberName: "Bob Smith", memberPhoneNumber: "0400000002", memberEmailAddress: "bob@example.com", memberAddress: "2 Main St" },
    ]
    setupGetSelectSequence({ buyerMembers })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { buyers: Array<{ name: string }> }
    expect(body.buyers).toHaveLength(2)
    expect(body.buyers[0]!.name).toBe("Alice Smith")
    expect(body.buyers[1]!.name).toBe("Bob Smith")
  })

  it("falls back to the entity row when no entity_members exist", async () => {
    setupGetSelectSequence({ buyerMembers: [] })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { buyers: Array<{ name: string; email: string }> }
    expect(body.buyers).toHaveLength(1)
    expect(body.buyers[0]!.name).toBe("Smith Entity")
    expect(body.buyers[0]!.email).toBe("smith@example.com")
  })

  it("returns an empty buyer placeholder when no entity_members and no entity row", async () => {
    setupGetSelectSequence({ entity: null as never, buyerMembers: [] })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { buyers: Array<{ name: string }> }
    expect(body.buyers).toHaveLength(1)
    expect(body.buyers[0]!.name).toBe("")
  })

  it("overrides buyers from entity_members with a *final* submission's buyersJson", async () => {
    const buyerMembers = [
      { memberName: "Old Name", memberPhoneNumber: "", memberEmailAddress: "", memberAddress: "" },
    ]
    const submission = {
      offerFormSubmissionId: 99,
      buyersJson: [{ name: "Submission Buyer", phone: "0499999999", email: "sub@example.com", address: "99 Sub St" }],
      offerAmount: "600000",
      submittedAt: new Date(),
      createdAt: new Date(),
    }
    setupGetSelectSequence({ buyerMembers, submission })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { buyers: Array<{ name: string }> }
    expect(body.buyers[0]!.name).toBe("Submission Buyer")
  })

  it("does NOT override buyers from entity_members when only a draft (no submittedAt) exists", async () => {
    const buyerMembers = [
      { memberName: "Entity Member", memberPhoneNumber: "0400000001", memberEmailAddress: "member@example.com", memberAddress: "1 Member St" },
    ]
    const draftSubmission = {
      offerFormSubmissionId: 99,
      buyersJson: [{ name: "Stale Draft Name", phone: "", email: "", address: "" }],
      offerAmount: "600000",
      submittedAt: null,
      createdAt: new Date(),
    }
    setupGetSelectSequence({ buyerMembers, submission: draftSubmission })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { buyers: Array<{ name: string; phone: string }> }
    expect(body.buyers[0]!.name).toBe("Entity Member")
    expect(body.buyers[0]!.phone).toBe("0400000001")
  })

  it("prefers submission offerAmount over buyer_offer when both exist", async () => {
    const submission = { offerFormSubmissionId: 1, offerAmount: "750000", buyersJson: null, createdAt: new Date() }
    const offer = { buyerOfferId: 1, offer: "600000", createdAt: new Date() }
    setupGetSelectSequence({ submission, offer })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { offerAmount: string }
    expect(body.offerAmount).toBe("750000")
  })

  it("includes rep data in prefill when a buyers-representative member exists", async () => {
    const repMember = {
      memberName: "Dave Agent",
      memberPhoneNumber: "0401234567",
      memberEmailAddress: "dave@agency.com",
      memberNotes: "yes",
    }
    setupGetSelectSequence({ repMember })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { rep: { name: string; email: string } | null }
    expect(body.rep).not.toBeNull()
    expect(body.rep!.name).toBe("Dave Agent")
    expect(body.rep!.email).toBe("dave@agency.com")
  })

  it("sets rep to null when no representative member exists", async () => {
    setupGetSelectSequence({ repMember: null })
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { rep: null }
    expect(body.rep).toBeNull()
  })

  it("assembles propertyAddress from street, suburb, state, postcode", async () => {
    setupGetSelectSequence()
    const res = await GET(new Request("http://localhost/api/offer-form/abc"), routeCtx("abc"))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { propertyAddress: string }
    expect(body.propertyAddress).toBe("100 Queen St, Brisbane City, QLD, 4000")
  })
})
