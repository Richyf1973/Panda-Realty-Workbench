"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

const mobileMediaQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function getMobileSnapshot(): boolean {
  return window.matchMedia(mobileMediaQuery).matches
}

function subscribeMobile(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(mobileMediaQuery)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

/**
 * True when the viewport is below the Tailwind `md` breakpoint (768px).
 * Uses `useSyncExternalStore` so the first client paint matches `matchMedia` (avoids a desktop flash on phones).
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    () => false,
  )
}
