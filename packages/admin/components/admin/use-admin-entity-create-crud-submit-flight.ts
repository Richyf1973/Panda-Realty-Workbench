"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"

import type { AdminEntityCreateMutationVariables } from "../../admin-entity-crud-form-values"

/**
 * Prevents double `createMutation.mutate` before TanStack Query flips `isPending`, and exposes
 * `createMutationInFlight` for disabling the create dialog footer.
 */
export function useAdminEntityCreateCrudSubmitFlight(
  createMutation: Pick<
    UseMutationResult<
      Record<string, unknown>,
      Error,
      AdminEntityCreateMutationVariables
    >,
    "mutate" | "isPending"
  >,
) {
  const createMutateInflightRef = useRef(false)
  const [createSubmitLocked, setCreateSubmitLocked] = useState(false)
  const createMutationInFlight =
    createMutation.isPending || createSubmitLocked

  const shouldBlockCreateSubmit = useCallback(
    () => createMutateInflightRef.current || createMutation.isPending,
    [createMutation.isPending],
  )

  const mutateCreateWithFlightLock = useCallback(
    (vars: AdminEntityCreateMutationVariables) => {
      createMutateInflightRef.current = true
      setCreateSubmitLocked(true)
      createMutation.mutate(vars, {
        onSettled: () => {
          createMutateInflightRef.current = false
          setCreateSubmitLocked(false)
        },
      })
    },
    [createMutation],
  )

  return {
    createMutationInFlight,
    shouldBlockCreateSubmit,
    mutateCreateWithFlightLock,
  }
}
