import { describe, expect, it, vi } from "vitest"

import { deleteChildEntityRowViaImmediateApi } from "./related-collection-inline-immediate-delete-api"

describe("deleteChildEntityRowViaImmediateApi", () => {
  it("DELETEs apiBase/id with credentials and throws on non-ok with message body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Offer not found" }),
      statusText: "Not Found",
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      deleteChildEntityRowViaImmediateApi("/api/admin/buyer-offers", "9001"),
    ).rejects.toThrow("Offer not found")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/buyer-offers/9001",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    )

    vi.unstubAllGlobals()
  })

  it("resolves when response is ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" })
    vi.stubGlobal("fetch", fetchMock)

    await deleteChildEntityRowViaImmediateApi("/api/admin/widgets", "42")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/widgets/42",
      expect.any(Object),
    )

    vi.unstubAllGlobals()
  })
})
