import type { QueryClient } from "@tanstack/react-query"
import type { MutableRefObject } from "react"

import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminNestedEntityPatchSuccessArgs } from "../../admin-client-registry-context"

/**
 * Side effects after nested edit **`PATCH`** succeeds — **before** closing the nested dialog.
 * Order is load-bearing: registry follow-up (e.g. Panda **`buyerOffers`** → **`property-entities`**)
 * runs while nested UI (isolated extras) is still mounted.
 */
export async function runNestedEntityEditMutationSuccessEffects(args: {
  readonly queryClient: QueryClient
  readonly slug: AdminEntitySlug
  readonly varsId: string
  readonly patchData: Record<string, unknown> | undefined
  readonly adminNestedEntityEditPatchSuccessFollowup?: (
    next: AdminNestedEntityPatchSuccessArgs,
  ) => Promise<void>
  readonly invalidateQueriesAfterNestedEntityPatchSuccess?: (
    qc: QueryClient,
    next: AdminNestedEntityPatchSuccessArgs,
  ) => void
  readonly adminNestedEntityPatchSuccessListenerRef?: MutableRefObject<
    ((next: AdminNestedEntityPatchSuccessArgs) => void | Promise<void>) | null
  >
}): Promise<void> {
  const {
    queryClient,
    slug,
    varsId,
    patchData,
    adminNestedEntityEditPatchSuccessFollowup,
    invalidateQueriesAfterNestedEntityPatchSuccess,
    adminNestedEntityPatchSuccessListenerRef,
  } = args

  if (
    adminNestedEntityEditPatchSuccessFollowup != null &&
    patchData != null &&
    typeof patchData === "object" &&
    !Array.isArray(patchData)
  ) {
    try {
      await adminNestedEntityEditPatchSuccessFollowup({
        nestedSlug: slug,
        nestedRowId: varsId,
        patchResponse: patchData as Record<string, unknown>,
      })
    } catch (e) {
      console.error(
        "[AdminNestedEntityCrudDialogHostOpen] adminNestedEntityEditPatchSuccessFollowup",
        e,
      )
    }
  }

  const listenerArgs: AdminNestedEntityPatchSuccessArgs = {
    nestedSlug: slug,
    nestedRowId: varsId,
    patchResponse: patchData,
  }

  invalidateQueriesAfterNestedEntityPatchSuccess?.(queryClient, listenerArgs)

  void queryClient.invalidateQueries({
    queryKey: ["admin", "entity-detail", slug],
  })
  void queryClient.invalidateQueries({
    queryKey: ["admin-entity-relation-filter-options", slug],
  })

  const listener = adminNestedEntityPatchSuccessListenerRef?.current
  if (listener) {
    try {
      await Promise.resolve(listener(listenerArgs))
    } catch (e) {
      console.error("[AdminNestedEntityCrudDialogHostOpen] listener", e)
    }
  }
}
