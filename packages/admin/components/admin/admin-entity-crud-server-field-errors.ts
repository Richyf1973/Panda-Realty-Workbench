"use client"

import { useEffect, useRef, useState } from "react"
import type { AdminEntityDefinition } from "../../admin-entity-types"

export function useAdminCrudServerFieldErrors({
  variant,
  isError,
  error,
  isPending,
  entityDefinition,
  mapper,
  form,
}: {
  variant: "create" | "edit"
  isError: boolean
  error: unknown
  isPending: boolean
  entityDefinition: AdminEntityDefinition
  mapper:
    | ((args: {
        variant: "create" | "edit"
        error: Error
        entityDefinition: AdminEntityDefinition
      }) => Record<string, string> | undefined)
    | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: { setFieldMeta: (field: string, updater: (prev: any) => any) => void }
}): { mutationErrorSuppressed: boolean } {
  const serverFieldKeysRef = useRef<string[]>([])
  const [mutationErrorSuppressed, setMutationErrorSuppressed] = useState(false)

  useEffect(() => {
    if (!isError || !(error instanceof Error) || !mapper) {
      if (mutationErrorSuppressed) setMutationErrorSuppressed(false)
      return
    }
    const fieldErrors = mapper({ variant, error, entityDefinition })
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return
    serverFieldKeysRef.current = Object.keys(fieldErrors)
    setMutationErrorSuppressed(true)
    for (const [key, msg] of Object.entries(fieldErrors)) {
      form.setFieldMeta(key, (prev) => ({
        ...prev,
        errorMap: { ...prev.errorMap, onServer: msg },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error])

  useEffect(() => {
    if (!isPending) return
    const keys = serverFieldKeysRef.current
    if (!keys.length) return
    serverFieldKeysRef.current = []
    setMutationErrorSuppressed(false)
    for (const key of keys) {
      form.setFieldMeta(key, (prev) => ({
        ...prev,
        errorMap: { ...prev.errorMap, onServer: undefined },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  return { mutationErrorSuppressed }
}
