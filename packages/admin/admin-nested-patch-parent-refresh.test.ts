import { describe, expect, it, vi } from "vitest"

import { resolveAdminNestedPatchParentRefreshPlan } from "./admin-nested-patch-parent-refresh"

const childPatch = {
  nestedChildEntitySlug: "property-entities",
  childFkToParentJsonKey: "propertyListId",
} as const

function jsonResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: ok ? status : 500,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

describe("resolveAdminNestedPatchParentRefreshPlan", () => {
  it("returns noop when dialog is not edit", async () => {
    const fetchMock = vi.fn()
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "create", rowId: "1" },
        nestedSlug: "sales",
        nestedRowId: "x",
        hasRelatedListener: true,
        relatedSlugSet: new Set(["sales"]),
        hasChildListener: false,
        childPatch: null,
        childApi: undefined,
        fkKey: undefined,
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: false, notify: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refetches and notifies for related slug match", async () => {
    const fetchMock = vi.fn()
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "99" },
        nestedSlug: "sales",
        nestedRowId: "x",
        hasRelatedListener: true,
        relatedSlugSet: new Set(["sales", "other"]),
        hasChildListener: false,
        childPatch: null,
        childApi: undefined,
        fkKey: undefined,
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: true, notify: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("uses patchResponse FK for child match without child GET", async () => {
    const fetchMock = vi.fn()
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "176829" },
        nestedSlug: "property-entities",
        nestedRowId: "pe-1",
        patchResponse: { propertyListId: "176829", id: "pe-1" },
        hasRelatedListener: false,
        relatedSlugSet: null,
        hasChildListener: true,
        childPatch,
        childApi: "/api/admin/property-entities",
        fkKey: "propertyListId",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: true, notify: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("GETs child row when patchResponse omits FK", async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse({ propertyListId: "176829", id: "pe-1" }),
    )
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "176829" },
        nestedSlug: "property-entities",
        nestedRowId: "pe-1",
        hasRelatedListener: false,
        relatedSlugSet: null,
        hasChildListener: true,
        childPatch,
        childApi: "/api/admin/property-entities",
        fkKey: "propertyListId",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: true, notify: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/admin/property-entities/pe-1",
    )
  })

  it("notifies without parent refetch when child GET fails", async () => {
    const fetchMock = vi.fn(() => jsonResponse(null, false, 404))
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "176829" },
        nestedSlug: "property-entities",
        nestedRowId: "pe-1",
        hasRelatedListener: false,
        relatedSlugSet: null,
        hasChildListener: true,
        childPatch,
        childApi: "/api/admin/property-entities",
        fkKey: "propertyListId",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: false, notify: true })
  })

  it("does not refetch or notify on child FK mismatch", async () => {
    const fetchMock = vi.fn()
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "176829" },
        nestedSlug: "property-entities",
        nestedRowId: "pe-1",
        patchResponse: { propertyListId: "999", id: "pe-1" },
        hasRelatedListener: false,
        relatedSlugSet: null,
        hasChildListener: true,
        childPatch,
        childApi: "/api/admin/property-entities",
        fkKey: "propertyListId",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: false, notify: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("merges related + child into one refetch plan (patch has FK)", async () => {
    const fetchMock = vi.fn()
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "176829" },
        nestedSlug: "property-entities",
        nestedRowId: "pe-1",
        patchResponse: { propertyListId: "176829" },
        hasRelatedListener: true,
        relatedSlugSet: new Set(["property-entities"]),
        hasChildListener: true,
        childPatch,
        childApi: "/api/admin/property-entities",
        fkKey: "propertyListId",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: true, notify: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("related still refetches when child GET fails after related match", async () => {
    const fetchMock = vi.fn(() => jsonResponse(null, false, 500))
    await expect(
      resolveAdminNestedPatchParentRefreshPlan({
        dlg: { kind: "edit", rowId: "176829" },
        nestedSlug: "property-entities",
        nestedRowId: "pe-1",
        hasRelatedListener: true,
        relatedSlugSet: new Set(["property-entities"]),
        hasChildListener: true,
        childPatch,
        childApi: "/api/admin/property-entities",
        fkKey: "propertyListId",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ refetchParent: true, notify: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
