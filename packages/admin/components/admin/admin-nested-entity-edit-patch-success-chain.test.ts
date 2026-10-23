import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { runNestedEntityEditMutationSuccessEffects } from "./admin-nested-entity-edit-patch-success-chain"

describe("runNestedEntityEditMutationSuccessEffects", () => {
  it("runs registry follow-up, then invalidateNested hook, then listener (load-bearing order)", async () => {
    const order: string[] = []
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(qc, "invalidateQueries").mockImplementation(() => Promise.resolve())

    await runNestedEntityEditMutationSuccessEffects({
      queryClient: qc,
      slug: "entities",
      varsId: "99",
      patchData: { id: "99", x: 1 },
      adminNestedEntityEditPatchSuccessFollowup: async () => {
        order.push("followup")
      },
      invalidateQueriesAfterNestedEntityPatchSuccess: () => {
        order.push("invalidateNestedCallback")
      },
      adminNestedEntityPatchSuccessListenerRef: {
        current: async () => {
          order.push("listener")
        },
      },
    })

    expect(order).toEqual([
      "followup",
      "invalidateNestedCallback",
      "listener",
    ])
  })

  it("skips follow-up when PATCH body is an array (unexpected JSON)", async () => {
    const order: string[] = []
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(qc, "invalidateQueries").mockImplementation(() => Promise.resolve())

    await runNestedEntityEditMutationSuccessEffects({
      queryClient: qc,
      slug: "entities",
      varsId: "99",
      patchData: [] as unknown as Record<string, unknown>,
      adminNestedEntityEditPatchSuccessFollowup: async () => {
        order.push("followup")
      },
      invalidateQueriesAfterNestedEntityPatchSuccess: () => {
        order.push("invalidateNestedCallback")
      },
      adminNestedEntityPatchSuccessListenerRef: {
        current: async () => {
          order.push("listener")
        },
      },
    })

    expect(order).toEqual(["invalidateNestedCallback", "listener"])
  })
})
