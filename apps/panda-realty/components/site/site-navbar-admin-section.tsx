"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { AdminLayoutNav } from "@repo/admin/components/admin/admin-layout-nav"
import { adminNavItemsClient } from "@/lib/admin/admin-nav-client"

export function SiteNavbarAdminSection() {
  const pathname = usePathname()
  if (!pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 text-sm"
      data-testid="site-navbar-admin-section"
    >
      <AdminLayoutNav items={adminNavItemsClient} />
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground"
        data-testid="admin-layout-home-link"
      >
        Home
      </Link>
    </div>
  )
}
