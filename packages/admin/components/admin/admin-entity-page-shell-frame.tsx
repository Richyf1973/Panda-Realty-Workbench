"use client"

import type { ReactNode } from "react"

import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { cn } from "@repo/ui/utils"

export function AdminEntityPageShellFrame({
  pageWidthClassName,
  children,
}: {
  pageWidthClassName: string
  children: ReactNode
}) {

  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden gap-2",
        pageWidthClassName,
      )}
      data-testid="admin-entity-page"
    >
      {children}
    </div>
  )
}
