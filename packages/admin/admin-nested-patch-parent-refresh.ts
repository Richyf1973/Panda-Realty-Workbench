/**
 * Decides whether the open parent CRUD dialog should refetch `listDetailSeed` and/or bump
 * related-inline draft sync after a nested entity PATCH. Keeps a single refetch + single notify
 * when both “related” and “child” rules apply.
 */

export type AdminNestedPatchParentRefreshDialog = {
  readonly kind: string
  readonly rowId: string
}

export type AdminNestedPatchParentRefreshChildConfig = {
  readonly nestedChildEntitySlug: string
  readonly childFkToParentJsonKey: string
}

export type ResolveAdminNestedPatchParentRefreshArgs = {
  readonly dlg: AdminNestedPatchParentRefreshDialog
  readonly nestedSlug: string
  readonly nestedRowId: string
  readonly patchResponse?: Record<string, unknown>
  readonly hasRelatedListener: boolean
  readonly relatedSlugSet: ReadonlySet<string> | null
  readonly hasChildListener: boolean
  readonly childPatch: AdminNestedPatchParentRefreshChildConfig | null
  readonly childApi: string | undefined
  readonly fkKey: string | undefined
  readonly fetch: typeof fetch
}

export type AdminNestedPatchParentRefreshPlan = {
  readonly refetchParent: boolean
  readonly notify: boolean
}

export async function resolveAdminNestedPatchParentRefreshPlan(
  args: ResolveAdminNestedPatchParentRefreshArgs,
): Promise<AdminNestedPatchParentRefreshPlan> {
  if (args.dlg.kind !== "edit") {
    return { refetchParent: false, notify: false }
  }

  let refetchParent = false
  let notify = false

  const relatedMatched =
    args.hasRelatedListener &&
    args.relatedSlugSet != null &&
    args.relatedSlugSet.has(args.nestedSlug)

  if (relatedMatched) {
    refetchParent = true
    notify = true
  }

  if (
    !args.hasChildListener ||
    args.childPatch == null ||
    args.nestedSlug !== args.childPatch.nestedChildEntitySlug
  ) {
    return { refetchParent, notify }
  }

  const fkKey = args.fkKey ?? args.childPatch.childFkToParentJsonKey
  const childApi = args.childApi
  if (childApi == null || childApi === "") {
    return { refetchParent, notify }
  }

  let childRow: Record<string, unknown> | undefined = args.patchResponse
  if (childRow == null || childRow[fkKey] == null) {
    // Call with an explicit receiver — bare `fetch` passed across modules loses `this` and throws
    // "Illegal invocation" in the browser.
    const pr = await args.fetch.call(
      globalThis,
      `${childApi}/${encodeURIComponent(args.nestedRowId)}`,
      { cache: "no-store" },
    )
    if (!pr.ok) {
      notify = true
      return { refetchParent, notify }
    }
    childRow = (await pr.json()) as Record<string, unknown>
  }

  const parentIdRaw = childRow[fkKey]
  if (parentIdRaw == null) {
    notify = true
    return { refetchParent, notify }
  }
  if (String(parentIdRaw) !== String(args.dlg.rowId)) {
    return { refetchParent, notify }
  }

  refetchParent = true
  notify = true
  return { refetchParent, notify }
}
