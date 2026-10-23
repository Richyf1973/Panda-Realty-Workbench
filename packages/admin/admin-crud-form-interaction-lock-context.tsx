"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

type AdminCrudFormInteractionLockContextValue = {
  readonly registerLock: () => void
  readonly unregisterLock: () => void
  readonly locked: boolean
}

const AdminCrudFormInteractionLockContext =
  createContext<AdminCrudFormInteractionLockContextValue | null>(null)

/**
 * Wraps one admin create/edit CRUD dialog form subtree so descendants can register
 * “still loading” work and the shell can disable inputs until everything settles.
 */
export function AdminCrudFormInteractionLockProvider({
  children,
}: {
  children: ReactNode
}) {
  const countRef = useRef(0)
  const [locked, setLocked] = useState(false)

  const registerLock = useCallback(() => {
    countRef.current += 1
    if (countRef.current === 1) setLocked(true)
  }, [])

  const unregisterLock = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1)
    if (countRef.current === 0) setLocked(false)
  }, [])

  const value = useMemo(
    () => ({ registerLock, unregisterLock, locked }),
    [registerLock, unregisterLock, locked],
  )

  return (
    <AdminCrudFormInteractionLockContext.Provider value={value}>
      {children}
    </AdminCrudFormInteractionLockContext.Provider>
  )
}

export function useAdminCrudFormInteractionLocked(): boolean {
  return useContext(AdminCrudFormInteractionLockContext)?.locked ?? false
}

/**
 * While `shouldLock` is true, increments the dialog form interaction lock (ref-counted).
 * No-op when there is no surrounding {@link AdminCrudFormInteractionLockProvider}.
 *
 * **TanStack Query v5:** Prefer **`query.isLoading`** (or `isPending && isFetching`) over raw
 * **`isPending`** when tying to network work — disabled queries with no cache stay **`isPending`**
 * forever even though nothing is fetching.
 */
export function useAdminCrudFormInteractionLockRegister(shouldLock: boolean) {
  const ctx = useContext(AdminCrudFormInteractionLockContext)
  useEffect(() => {
    if (ctx == null || !shouldLock) return
    ctx.registerLock()
    return () => ctx.unregisterLock()
  }, [ctx, shouldLock])
}
