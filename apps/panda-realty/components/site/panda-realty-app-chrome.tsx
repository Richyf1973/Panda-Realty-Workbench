"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import { PandaRealtyAdminAppSidebar } from "@/components/site/panda-realty-admin-app-sidebar"
import { SiteNavbarAccountActions } from "@/components/site/site-navbar-account-actions"
import { SiteNavbarAdminSection } from "@/components/site/site-navbar-admin-section"
import { SiteNavbarThemeToggle } from "@/components/site/site-navbar-theme-toggle"
import type { AdminNavPlacement } from "@/lib/config/frontend"
import { AdminListViewportChromeProvider } from "@repo/admin/admin-list-viewport-chrome-context"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/sidebar"
import { cn } from "@repo/ui/utils"

function PandaRealtySidebarInsetWithViewportChrome({
  children,
  initialSignedIn,
  authConfigured,
  canAccessAdmin,
}: {
  children: ReactNode
  initialSignedIn: boolean
  authConfigured: boolean
  canAccessAdmin: boolean
}) {
  const pathname = usePathname()
  const [fullViewportList, setFullViewportList] = useState(false)

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) {
      setFullViewportList(false)
    }
  }, [pathname])

  const chromeValue = useMemo(
    () => ({ fullViewportList, setFullViewportList }),
    [fullViewportList],
  )

  const adminFullViewport =
    fullViewportList && (pathname?.startsWith("/admin") ?? false)

  return (
    <AdminListViewportChromeProvider value={chromeValue}>
      <header
        className={cn(
          "sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md",
          adminFullViewport && "hidden",
        )}
        data-testid="admin-sidebar-top-bar"
      >
        <SidebarTrigger data-testid="admin-sidebar-trigger" />
        <div className="flex flex-1 items-center justify-end gap-2">
          <SiteNavbarThemeToggle />
          {!authConfigured ? (
            <span
              className="text-xs text-muted-foreground"
              data-testid="site-navbar-auth-unavailable"
            >
              Auth unavailable
            </span>
          ) : (
            <SiteNavbarAccountActions initialSignedIn={initialSignedIn} />
          )}
        </div>
      </header>
      {adminFullViewport ? (
        <div
          className="fixed left-2 top-2 z-100 rounded-md border border-border/80 bg-background/95 p-0.5 shadow-md backdrop-blur-md"
          data-testid="admin-full-viewport-sidebar-trigger-wrap"
        >
          <SidebarTrigger
            data-testid="admin-full-viewport-sidebar-trigger"
            className="size-9"
          />
        </div>
      ) : null}
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          adminFullViewport ? "overflow-hidden" : "overflow-auto",
        )}
      >
        {children}
      </main>
    </AdminListViewportChromeProvider>
  )
}

function SiteNavbarHeader({
  initialSignedIn,
  authConfigured,
}: {
  initialSignedIn: boolean
  authConfigured: boolean
}) {
  return (
    <header
      data-testid="site-navbar"
      className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-2 sm:py-0">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/"
            className="shrink-0 font-semibold text-foreground"
            aria-label="Panda Realty home"
            data-testid="site-navbar-logo-link"
          >
            Panda Realty
          </Link>
          <SiteNavbarAdminSection />
        </div>

        <nav
          className="flex items-center gap-2"
          aria-label="Account"
          data-testid="site-navbar-actions"
        >
          <SiteNavbarThemeToggle />
          {!authConfigured ? (
            <span
              className="text-xs text-muted-foreground"
              data-testid="site-navbar-auth-unavailable"
            >
              Auth unavailable
            </span>
          ) : (
            <SiteNavbarAccountActions initialSignedIn={initialSignedIn} />
          )}
        </nav>
      </div>
    </header>
  )
}

export function PandaRealtyAppChrome({
  children,
  navPlacement,
  initialSignedIn,
  authConfigured,
  canAccessAdmin,
}: {
  children: ReactNode
  navPlacement: AdminNavPlacement
  initialSignedIn: boolean
  authConfigured: boolean
  canAccessAdmin: boolean
}) {
  const pathname = usePathname()
  const useAdminSidebarShell =
    pathname === "/" || (pathname?.startsWith("/admin") ?? false)

  if (pathname?.startsWith("/offer-form") || pathname?.startsWith("/portal")) {
    return <>{children}</>
  }

  if (navPlacement === "sidebar" && useAdminSidebarShell) {
    return (
      <SidebarProvider className="flex min-h-dvh w-full min-w-0 flex-1 flex-row">
        <PandaRealtyAdminAppSidebar canAccessAdmin={canAccessAdmin} />
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PandaRealtySidebarInsetWithViewportChrome
            initialSignedIn={initialSignedIn}
            authConfigured={authConfigured}
            canAccessAdmin={canAccessAdmin}
          >
            {children}
          </PandaRealtySidebarInsetWithViewportChrome>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteNavbarHeader
        initialSignedIn={initialSignedIn}
        authConfigured={authConfigured}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
