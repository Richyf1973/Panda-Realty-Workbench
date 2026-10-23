import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/google-contacts-fetch-retry", () => ({
  fetchWith429Retry: vi.fn(),
}))

import { fetchWith429Retry } from "@/lib/google-contacts-fetch-retry"
import { upsertGoogleContact } from "@/lib/google-contacts-client"

function makeOkResponse(body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("upsertGoogleContact — email normalization", () => {
  it("writes email as lowercase when email is provided in uppercase", async () => {
    // No match by email, no match by phone → create
    vi.mocked(fetchWith429Retry)
      .mockResolvedValueOnce(makeOkResponse({ results: [] })) // searchContactByEmail
      .mockResolvedValueOnce(makeOkResponse({ results: [] })) // searchContactByPhone
      .mockResolvedValueOnce(makeOkResponse({ resourceName: "people/123" })) // createContact

    await upsertGoogleContact("token", {
      entityName: "CHRISTOPHER WILLIAM MATTHEWS",
      emailAddress: "MIMRUBY@GMAIL.COM",
      phoneNumber: "0419665682",
      propertyRole: "omit",
    })

    const createCall = vi.mocked(fetchWith429Retry).mock.calls[2]!
    const body = JSON.parse(createCall[1]?.body as string)
    expect(body.emailAddresses?.[0]?.value).toBe("mimruby@gmail.com")
  })

  it("searches by lowercase email even when input is uppercase", async () => {
    vi.mocked(fetchWith429Retry)
      .mockResolvedValueOnce(makeOkResponse({ results: [] })) // searchContactByEmail
      .mockResolvedValueOnce(makeOkResponse({ results: [] })) // searchContactByPhone
      .mockResolvedValueOnce(makeOkResponse({ resourceName: "people/123" })) // createContact

    await upsertGoogleContact("token", {
      entityName: "CHRISTOPHER WILLIAM MATTHEWS",
      emailAddress: "MIMRUBY@GMAIL.COM",
      phoneNumber: "0419665682",
      propertyRole: "omit",
    })

    const searchCall = vi.mocked(fetchWith429Retry).mock.calls[0]!
    const searchUrl = searchCall[0] as string
    expect(searchUrl).toContain(encodeURIComponent("mimruby@gmail.com"))
  })

  it("writes lowercase email when updating an existing contact", async () => {
    const existingPerson = {
      resourceName: "people/c123",
      etag: "abc",
      names: [{ givenName: "Old Name" }],
      emailAddresses: [{ value: "mimruby@gmail.com" }],
    }
    vi.mocked(fetchWith429Retry)
      .mockResolvedValueOnce(makeOkResponse({ results: [{ person: existingPerson }] })) // search finds existing
      .mockResolvedValueOnce(makeOkResponse({})) // updateContact

    await upsertGoogleContact("token", {
      entityName: "CHRISTOPHER WILLIAM MATTHEWS",
      emailAddress: "MIMRUBY@GMAIL.COM",
      phoneNumber: "0419665682",
      propertyRole: "omit",
    })

    const updateCall = vi.mocked(fetchWith429Retry).mock.calls[1]!
    const body = JSON.parse(updateCall[1]?.body as string)
    expect(body.emailAddresses?.[0]?.value).toBe("mimruby@gmail.com")
  })
})
