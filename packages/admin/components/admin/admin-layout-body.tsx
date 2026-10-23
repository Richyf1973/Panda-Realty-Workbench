"use client"

import type { ReactNode } from "react"

import { usePathname } from "next/navigation"

import { useOptionalAdminListViewportChrome } from "../../admin-list-viewport-chrome-context"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { cn } from "@repo/ui/utils"

/**
 * Admin route content wrapper: comfortable padding on desktop, tighter insets on compact
 * viewports (same breakpoint as mobile admin lists). When {@link AdminListViewportChromeProvider}
 * is mounted and full-screen list mode is on (Vibram Sales), uses minimal padding.
 */
export function AdminLayoutBody({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const chrome = useOptionalAdminListViewportChrome()
  const isCompactViewport = useCompactAdminListViewport()
  const isAdminRoute = pathname?.startsWith("/admin") ?? false
  const tightChrome = isAdminRoute && chrome?.fullViewportList === true
  const compactAdminInset =
    isAdminRoute && isCompactViewport && !tightChrome

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        tightChrome
          ? "px-2 pb-2 pt-1"
          : compactAdminInset
            ? "px-2 pb-1.5 pt-2"
            : "px-6 pb-6 pt-6",
      )}
      data-testid="admin-layout"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
