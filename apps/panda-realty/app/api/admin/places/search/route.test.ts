import { afterEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_API_KEY
  vi.resetModules()
})

function openRouterResponse(content: unknown) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: typeof content === "string" ? content : JSON.stringify(content),
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}

describe("GET /api/admin/places/search", () => {
  it("returns empty items when q is missing", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ items: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 400 when OPENROUTER_API_KEY is not configured", async () => {
    delete process.env.OPENROUTER_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=CCQ%20Law"))

    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("calls OpenRouter chat completions with claude-haiku-4.5:online and JSON response_format", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const fetchMock = vi.fn().mockResolvedValue(
      openRouterResponse({
        items: [
          {
            name: "CCQ Law",
            phone: "07 3000 0000",
            email: "info@ccqlaw.com.au",
            address: "123 Queen St",
            suburb: "Brisbane City",
            state: "QLD",
            postcode: "4000",
          },
        ],
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    await GET(new Request("http://localhost/api/admin/places/search?q=CCQ%20Law"))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions")
    expect(init.method).toBe("POST")
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer test-key")
    expect(headers["Content-Type"]).toBe("application/json")
    const body = JSON.parse(init.body as string) as {
      model: string
      response_format: { type: string }
      messages: Array<{ role: string; content: string }>
    }
    expect(body.model).toBe("anthropic/claude-haiku-4.5:online")
    expect(body.response_format).toEqual({ type: "json_object" })
    expect(body.messages.some((m) => m.content.includes("CCQ Law"))).toBe(true)
    expect(body.messages.some((m) => m.content.toLowerCase().includes("australia"))).toBe(true)
  })

  it("maps LLM items to the BusinessSearchResult shape with synthetic placeId", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const fetchMock = vi.fn().mockResolvedValue(
      openRouterResponse({
        items: [
          {
            name: "CCQ Law",
            phone: "07 3000 0000",
            email: "info@ccqlaw.com.au",
            address: "123 Queen St",
            suburb: "Brisbane City",
            state: "QLD",
            postcode: "4000",
          },
        ],
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=CCQ%20Law"))

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      items: Array<{
        placeId: string
        name: string
        phone: string
        email: string
        address: string
        suburb: string
        state: string
        postcode: string
      }>
    }
    expect(body.items).toHaveLength(1)
    const [item] = body.items
    expect(item.name).toBe("CCQ Law")
    expect(item.phone).toBe("07 3000 0000")
    expect(item.email).toBe("info@ccqlaw.com.au")
    expect(item.address).toBe("123 Queen St")
    expect(item.suburb).toBe("Brisbane City")
    expect(item.state).toBe("QLD")
    expect(item.postcode).toBe("4000")
    expect(typeof item.placeId).toBe("string")
    expect(item.placeId.length).toBeGreaterThan(0)
  })

  it("returns empty items when LLM returns no items", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const fetchMock = vi.fn().mockResolvedValue(openRouterResponse({ items: [] }))
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=nothing"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ items: [] })
  })

  it("fills missing optional fields with empty strings", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const fetchMock = vi.fn().mockResolvedValue(
      openRouterResponse({
        items: [{ name: "Sparse Co" }],
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=sparse"))

    const body = (await res.json()) as {
      items: Array<Record<string, string>>
    }
    expect(body.items[0]).toMatchObject({
      name: "Sparse Co",
      phone: "",
      email: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
    })
  })

  it("returns 502 and logs upstream body on OpenRouter error", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Insufficient credits" } }), {
        status: 402,
        statusText: "Payment Required",
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=CCQ%20Law"))

    expect(res.status).toBe(502)
    expect(consoleErrorSpy).toHaveBeenCalled()
    const [, ctx] = consoleErrorSpy.mock.calls[0] as [string, Record<string, unknown>]
    expect(ctx).toMatchObject({
      query: "CCQ Law",
      status: 402,
      statusText: "Payment Required",
    })
  })

  it("extracts JSON from a markdown code fence with trailing citations (`:online` mode)", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const fenced =
      "```json\n" +
      JSON.stringify({
        items: [
          {
            name: "CCQ Law Pty. Ltd.",
            phone: "1800 227 529",
            email: "info@ccqlaw.com.au",
            address: "Units 2 & 3 of 1440 Anzac Avenue, Kallangur",
            suburb: "Kallangur",
            state: "QLD",
            postcode: "4303",
          },
        ],
      }) +
      "\n```\n\n**Sources:**\n- [ccqlaw.com.au](https://ccqlaw.com.au/)\n"

    const fetchMock = vi.fn().mockResolvedValue(openRouterResponse(fenced))
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=CCQ%20Law"))

    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ name: string }> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0].name).toBe("CCQ Law Pty. Ltd.")
  })

  it("returns empty items when LLM JSON content is malformed", async () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = vi.fn().mockResolvedValue(openRouterResponse("not-json-at-all"))
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/api/admin/places/search?q=anything"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ items: [] })
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
