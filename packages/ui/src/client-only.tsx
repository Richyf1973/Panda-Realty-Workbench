"use client"

import { useSyncExternalStore, type ReactNode } from "react"

function subscribeToNothing() {
  return () => {}
}

/**
 * Renders `fallback` on the server and until after mount, then `children`.
 * Use under Radix primitives that disagree with SSR (e.g. Select ids / data-state).
 */
export function ClientOnly({
  children,
  fallback,
}: {
  children: ReactNode
  fallback: ReactNode
}) {
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
  if (!mounted) return fallback
  return children
}
