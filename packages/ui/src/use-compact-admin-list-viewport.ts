"use client"

import * as React from "react"

/** Matches Tailwind `md` breakpoint — same as {@link useIsMobile}. */
export const ADMIN_LIST_COMPACT_MAX_WIDTH_PX = 767

/**
 * When the *visible* viewport height is at or below this (CSS px), admin entity lists
 * use the same layout as narrow width (mobile cards, compact toolbar, compact pagination).
 * Catches short portrait phones (browser chrome) and landscape phones that are wide but not tall.
 */
export const ADMIN_LIST_COMPACT_MAX_HEIGHT_PX = 640

const widthQuery = `(max-width: ${ADMIN_LIST_COMPACT_MAX_WIDTH_PX}px)`
const heightQuery = `(max-height: ${ADMIN_LIST_COMPACT_MAX_HEIGHT_PX}px)`

function compactAdminListViewportMatches(): boolean {
  return (
    window.matchMedia(widthQuery).matches ||
    window.matchMedia(heightQuery).matches
  )
}

function subscribeCompactAdminListViewport(onStoreChange: () => void): () => void {
  const w = window.matchMedia(widthQuery)
  const h = window.matchMedia(heightQuery)
  const listener = () => {
    onStoreChange()
  }
  w.addEventListener("change", listener)
  h.addEventListener("change", listener)
  return () => {
    w.removeEventListener("change", listener)
    h.removeEventListener("change", listener)
  }
}

/**
 * True when the viewport is narrow (below `md`) **or** short (see
 * {@link ADMIN_LIST_COMPACT_MAX_HEIGHT_PX}), so admin list UIs should use compact / mobile layout.
 */
export function useCompactAdminListViewport(): boolean {
  return React.useSyncExternalStore(
    subscribeCompactAdminListViewport,
    compactAdminListViewportMatches,
    () => false,
  )
}
