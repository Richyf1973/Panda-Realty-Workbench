"use client"

import {
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react"

import {
  AdminClientRegistryProvider,
  useAdminClientRegistry,
} from "@repo/admin/admin-client-registry-context"
import type { AdminNestedEntityPatchSuccessArgs } from "@repo/admin/admin-client-registry-context"

/**
 * Gives the inline property-entity workspace its own refs so it does NOT contaminate
 * the parent entities form's save payload.
 */
export function IsolatedRegistryWrapper({
  children,
  extrasRef,
}: {
  children: ReactNode
  extrasRef: MutableRefObject<Record<string, unknown>>
}) {
  const parentRegistry = useAdminClientRegistry()
  const omitKeysRef = useRef(new Set<string>())
  const nestedListenerRef = useRef<
    ((args: AdminNestedEntityPatchSuccessArgs) => void | Promise<void>) | null
  >(null)

  const value = useMemo(
    () => ({
      ...parentRegistry,
      adminEntityCrudExtrasForSaveRef: extrasRef,
      adminEntityCrudPatchOmitExtrasKeysRef: omitKeysRef,
      adminNestedEntityPatchSuccessListenerRef: nestedListenerRef,
    }),
    // parentRegistry is stable (useMemo in the provider); spread once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentRegistry, extrasRef],
  )

  return (
    <AdminClientRegistryProvider value={value}>
      {children}
    </AdminClientRegistryProvider>
  )
}
