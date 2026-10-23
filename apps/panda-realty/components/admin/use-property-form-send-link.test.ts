// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createElement, act } from "react"
import { createRoot } from "react-dom/client"
import { usePropertyFormSendLink } from "./use-property-form-send-link"

function renderHook<T>(fn: () => T) {
  const result = { current: null as unknown as T }
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  function Wrapper() { result.current = fn(); return null }
  act(() => { root.render(createElement(Wrapper)) })
  return { result, unmount: () => act(() => root.unmount()) }
}

global.fetch = vi.fn()

describe("usePropertyFormSendLink", () => {
  beforeEach(() => vi.resetAllMocks())

  it("loads buyers on mount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [
        { entityId: 1, entityName: "Alice", emailAddress: "alice@test.com" },
        { entityId: 2, entityName: "Bob", emailAddress: null },
      ]}),
    } as Response)

    const { result } = renderHook(() =>
      usePropertyFormSendLink({ propertyListId: 10, propertyFormId: 5 })
    )

    await act(async () => {})

    expect(result.current.buyers).toHaveLength(2)
    expect(result.current.buyers[0].emailAddress).toBe("alice@test.com")
  })

  it("selects offer for buyer and tracks in selections map", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ entityId: 1, entityName: "Alice", emailAddress: "alice@test.com" }] }),
    } as Response)

    const { result } = renderHook(() =>
      usePropertyFormSendLink({ propertyListId: 10, propertyFormId: 5 })
    )
    await act(async () => {})

    act(() => result.current.selectOffer(1, "none"))
    expect(result.current.selections.get(1)).toBe("none")
    expect(result.current.isReady).toBe(true)

    act(() => result.current.selectOffer(1, 42))
    expect(result.current.selections.get(1)).toBe(42)
  })

  it("calls send API with selected buyers and reports success", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ entityId: 1, entityName: "Alice", emailAddress: "alice@test.com" }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: 1, failures: [] }) } as Response)

    const onSent = vi.fn()
    const { result } = renderHook(() =>
      usePropertyFormSendLink({ propertyListId: 10, propertyFormId: 5, onSent })
    )
    await act(async () => {})

    act(() => result.current.selectOffer(1, "none"))
    await act(async () => { await result.current.submit() })

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/property-forms/send-link",
      expect.objectContaining({ method: "POST" }),
    )
    expect(onSent).toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it("sends buyerOfferIds keyed by propertyEntityId when offer selected", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ entityId: 1, propertyEntityId: 10, entityName: "Alice", emailAddress: "alice@test.com" }] }),
      } as Response)  // call[0]: buyers
      .mockResolvedValueOnce({ ok: true, json: async () => ({ offers: [] }) } as Response)  // call[1]: buyer-offers for PE 10
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: 1, failures: [] }) } as Response)  // call[2]: send-link

    const { result } = renderHook(() =>
      usePropertyFormSendLink({ propertyListId: 10, propertyFormId: 5 })
    )
    await act(async () => {})

    act(() => result.current.selectOffer(1, 99))
    await act(async () => { await result.current.submit() })

    const callArgs = vi.mocked(fetch).mock.calls[2]!
    const body = JSON.parse((callArgs[1] as RequestInit).body as string) as Record<string, unknown>
    expect(body.buyerOfferIds).toEqual({ 10: 99 })
    expect(body).not.toHaveProperty("buyerOfferId")
  })

  it("omits buyerOfferIds entirely when no-offer selected", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ entityId: 1, propertyEntityId: 10, entityName: "Alice", emailAddress: "alice@test.com" }] }),
      } as Response)  // call[0]: buyers
      .mockResolvedValueOnce({ ok: true, json: async () => ({ offers: [] }) } as Response)  // call[1]: buyer-offers for PE 10
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sent: 1, failures: [] }) } as Response)  // call[2]: send-link

    const { result } = renderHook(() =>
      usePropertyFormSendLink({ propertyListId: 10, propertyFormId: 5 })
    )
    await act(async () => {})

    act(() => result.current.selectOffer(1, "none"))
    await act(async () => { await result.current.submit() })

    const callArgs = vi.mocked(fetch).mock.calls[2]!
    const body = JSON.parse((callArgs[1] as RequestInit).body as string) as Record<string, unknown>
    expect(body).not.toHaveProperty("buyerOfferIds")
    expect(body).not.toHaveProperty("buyerOfferId")
  })
})
