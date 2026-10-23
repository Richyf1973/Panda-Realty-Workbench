import { describe, expect, it, vi } from "vitest"

import { compute429BackoffMs, fetchWith429Retry } from "./google-contacts-fetch-retry"

describe("compute429BackoffMs", () => {
  it("uses Retry-After seconds when present", () => {
    const h = new Headers({ "retry-after": "2" })
    expect(compute429BackoffMs(h, 99)).toBe(2000)
  })

  it("uses exponential fallback when Retry-After missing", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const h = new Headers()
    expect(compute429BackoffMs(h, 0)).toBe(500)
    expect(compute429BackoffMs(h, 1)).toBe(1000)
    expect(compute429BackoffMs(h, 2)).toBe(2000)
    vi.mocked(Math.random).mockRestore()
  })

  it("caps Retry-After seconds at MAX", () => {
    const h = new Headers({ "retry-after": "9999" })
    expect(compute429BackoffMs(h, 0)).toBe(120_000)
  })
})

describe("fetchWith429Retry", () => {
  it("retries on 429 then returns success", async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const p = fetchWith429Retry("https://example.test/x", { method: "GET" })
    await vi.runAllTimersAsync()
    const res = await p

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
})
