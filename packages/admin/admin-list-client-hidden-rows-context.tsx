"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/**
 * Client-only "hide row from view" state for an admin entity list.
 *
 * A row id added here is filtered out of the on-screen table only — it is NOT
 * persisted, sent to the server, or applied to the export. The set lives in
 * component memory, so a reload or a fresh search (which remounts the provider
 * via its `key`) clears it. Reset clears it on demand.
 *
 * The mechanism is dormant unless `enabled` is true (opt-in per slug via the
 * registry's `adminEntityListRowHideFromViewSlugs`). When disabled, `isHidden`
 * always returns false and `hide` is a no-op, so existing lists are unaffected.
 */
export type AdminListClientHiddenRowsValue = {
  readonly enabled: boolean
  readonly hiddenCount: number
  readonly isHidden: (rowId: string) => boolean
  readonly hide: (rowId: string) => void
  readonly reset: () => void
}

const AdminListClientHiddenRowsContext =
  createContext<AdminListClientHiddenRowsValue | null>(null)

export function AdminListClientHiddenRowsProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )

  const hide = useCallback(
    (rowId: string) => {
      if (!enabled) return
      setHiddenIds((prev) => {
        if (prev.has(rowId)) return prev
        const next = new Set(prev)
        next.add(rowId)
        return next
      })
    },
    [enabled],
  )

  const reset = useCallback(() => {
    setHiddenIds((prev) => (prev.size === 0 ? prev : new Set<string>()))
  }, [])

  const isHidden = useCallback(
    (rowId: string) => enabled && hiddenIds.has(rowId),
    [enabled, hiddenIds],
  )

  const value = useMemo<AdminListClientHiddenRowsValue>(
    () => ({
      enabled,
      hiddenCount: enabled ? hiddenIds.size : 0,
      isHidden,
      hide,
      reset,
    }),
    [enabled, hiddenIds, isHidden, hide, reset],
  )

  return (
    <AdminListClientHiddenRowsContext.Provider value={value}>
      {children}
    </AdminListClientHiddenRowsContext.Provider>
  )
}

const DISABLED_VALUE: AdminListClientHiddenRowsValue = {
  enabled: false,
  hiddenCount: 0,
  isHidden: () => false,
  hide: () => {},
  reset: () => {},
}

/**
 * Read the hidden-rows state. Safe to call outside a provider (e.g. lists that
 * never opt in) — returns a permanently-disabled value rather than throwing.
 */
export function useAdminListClientHiddenRows(): AdminListClientHiddenRowsValue {
  return useContext(AdminListClientHiddenRowsContext) ?? DISABLED_VALUE
}
