"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@repo/ui/utils"

export type AdminLayoutNavItem = { readonly href: string; readonly label: string }

export function AdminLayoutNav({
  items,
  getItemIcon,
}: {
  items: readonly AdminLayoutNavItem[]
  /** Optional leading icon (e.g. Lucide) per link — keep render light; callers own icon config. */
  getItemIcon?: (item: AdminLayoutNavItem, slug: string) => ReactNode
}) {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap gap-3 text-sm"
      data-testid="admin-layout-nav"
      aria-label="Admin sections"
    >
      {items.map((item) => {
        const slug = item.href.replace(/^\/admin\//, "")
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        const icon = getItemIcon?.(item, slug)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            data-testid={`admin-layout-nav-link--${slug}`}
          >
            {icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
