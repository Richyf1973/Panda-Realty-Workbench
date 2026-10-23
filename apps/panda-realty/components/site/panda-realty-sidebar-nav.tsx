"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useId, useState } from "react"
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Kanban,
} from "lucide-react"

import { adminNavItemsClient } from "@/lib/admin/admin-nav-client"
import { getPandaRealtyAdminSidebarIconForSlug } from "@/lib/config/panda-realty-admin-sidebar-nav"
import type { AdminLayoutNavItem } from "@repo/admin/components/admin/admin-layout-nav"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@repo/ui/sidebar"
import { cn } from "@repo/ui/utils"

import { PEOPLE_NAV_ITEMS, isPeopleItemActive } from "./panda-realty-sidebar-people-items"
import { SidebarPeopleSection } from "./panda-realty-sidebar-people-section"

const ENTITIES_ADMIN_HREF = "/admin/entities"
const PROPERTIES_ADMIN_HREF = "/admin/properties"
const PIPELINE_ADMIN_HREF = "/admin/pipeline"
const CALENDAR_ADMIN_HREF = "/admin/calendar"
const EMAIL_SIGNATURES_ADMIN_HREF = "/admin/email-signatures"
// Contacts has its own People-section link (PEOPLE_NAV_ITEMS) → exclude the
// auto-generated master-list entry so the nav shows a single "Contacts" item.
const CONTACTS_ADMIN_HREF = "/admin/contacts"

function isPandaMasterListNavHref(href: string): boolean {
  return (
    href !== ENTITIES_ADMIN_HREF &&
    href !== PROPERTIES_ADMIN_HREF &&
    href !== PIPELINE_ADMIN_HREF &&
    href !== CALENDAR_ADMIN_HREF &&
    href !== EMAIL_SIGNATURES_ADMIN_HREF &&
    href !== CONTACTS_ADMIN_HREF
  )
}

function slugFromHref(href: string): string {
  return href.replace(/^\/admin\//, "")
}

function isItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PandaRealtySidebarNav({
  canAccessAdmin,
}: {
  canAccessAdmin: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state, isMobile, setOpenMobile } = useSidebar()

  const propertiesNavItem = adminNavItemsClient.find(
    (item) => item.href === PROPERTIES_ADMIN_HREF,
  )
  const masterListNavItems = adminNavItemsClient.filter((item) =>
    isPandaMasterListNavHref(item.href),
  )

  const anyPeopleActive = PEOPLE_NAV_ITEMS.some((item) =>
    isPeopleItemActive(pathname, searchParams, item),
  )

  const masterListOpenDefault =
    masterListNavItems.some((item) => isItemActive(pathname, item.href)) ||
    anyPeopleActive
  const [masterListOpen, setMasterListOpen] = useState(masterListOpenDefault)
  const masterListSectionId = useId()

  useEffect(() => {
    const anyMasterActive = adminNavItemsClient
      .filter((item) => isPandaMasterListNavHref(item.href))
      .some((item) => isItemActive(pathname, item.href))
    const anyPeople = PEOPLE_NAV_ITEMS.some((item) =>
      isPeopleItemActive(pathname, searchParams, item),
    )
    if (anyMasterActive || anyPeople) setMasterListOpen(true)
  }, [pathname, searchParams])

  const collapsedRail = state === "collapsed" && !isMobile

  const linkRowClass =
    "flex w-full min-w-0 items-center gap-3 px-0.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"

  const handleNavLinkClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const renderNavLink = (item: AdminLayoutNavItem) => {
    const slug = slugFromHref(item.href)
    const active = isItemActive(pathname, item.href)
    const NavIcon =
      slug === "pipeline" ? Kanban : slug === "calendar" ? CalendarDays : getPandaRealtyAdminSidebarIconForSlug(slug)
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.label}
          className="gap-0 px-1.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2"
        >
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-testid={`admin-layout-nav-link--${slug}`}
            className={linkRowClass}
            onClick={handleNavLinkClick}
          >
            <NavIcon className="shrink-0 opacity-70" aria-hidden />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {item.label}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  if (!canAccessAdmin) {
    return (
      <div data-testid="site-navbar-admin-section" className="px-2 py-2">
        <p className="text-sidebar-foreground/70 px-2 text-xs">
          Sign in to open admin entities.
        </p>
      </div>
    )
  }

  const pipelineNavItem: AdminLayoutNavItem = {
    href: PIPELINE_ADMIN_HREF,
    label: "Pipeline",
  }

  const calendarNavItem: AdminLayoutNavItem = {
    href: CALENDAR_ADMIN_HREF,
    label: "Calendar",
  }
  const emailSignaturesNavItem: AdminLayoutNavItem = {
    href: EMAIL_SIGNATURES_ADMIN_HREF,
    label: "Email Signatures",
  }

  const collapsedNavOrder: AdminLayoutNavItem[] = [
    ...(propertiesNavItem ? [propertiesNavItem] : []),
    pipelineNavItem,
    calendarNavItem,
    emailSignaturesNavItem,
    ...masterListNavItems,
    ...PEOPLE_NAV_ITEMS.map((p) => ({ href: p.href, label: p.label })),
  ]

  return (
    <div data-testid="site-navbar-admin-section">
      <nav
        data-testid="admin-layout-nav"
        aria-label="Admin sections"
        className="flex flex-col gap-0.5 px-2 py-2"
      >
        <SidebarMenu className="gap-1">
          {collapsedRail ? (
            collapsedNavOrder.map((item) => renderNavLink(item))
          ) : (
            <>
              {propertiesNavItem ? renderNavLink(propertiesNavItem) : null}
              {renderNavLink(pipelineNavItem)}
              {renderNavLink(calendarNavItem)}
              {renderNavLink(emailSignaturesNavItem)}
              {masterListNavItems.length > 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    onClick={() => setMasterListOpen((o) => !o)}
                    aria-expanded={masterListOpen}
                    aria-controls={masterListSectionId}
                    tooltip="Master List"
                    className="w-full gap-3 px-1.5 py-2"
                    isActive={
                      masterListNavItems.some((item) =>
                        isItemActive(pathname, item.href),
                      ) || anyPeopleActive
                    }
                    data-testid="admin-sidebar-master-list-toggle"
                  >
                    <FolderTree className="shrink-0 opacity-80" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-left font-medium">
                      Master List
                    </span>
                    {masterListOpen ? (
                      <ChevronDown
                        className="size-4 shrink-0 opacity-60"
                        aria-hidden
                      />
                    ) : (
                      <ChevronRight
                        className="size-4 shrink-0 opacity-60"
                        aria-hidden
                      />
                    )}
                  </SidebarMenuButton>
                  {masterListOpen ? (
                    <SidebarMenuSub
                      id={masterListSectionId}
                      className="mx-0 ml-3 mt-1 border-l border-sidebar-border/80 pl-4"
                    >
                      {masterListNavItems.map((item) => {
                        const slug = slugFromHref(item.href)
                        const active = isItemActive(pathname, item.href)
                        const SubIcon =
                          getPandaRealtyAdminSidebarIconForSlug(slug)
                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton
                              asChild
                              size="md"
                              isActive={active}
                              className={cn(
                                "gap-3 rounded-md py-2 pr-1 pl-1",
                                active && "font-medium",
                              )}
                            >
                              <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                data-testid={`admin-layout-nav-link--${slug}`}
                                className="flex min-w-0 items-center gap-3"
                                onClick={handleNavLinkClick}
                              >
                                <SubIcon
                                  className="size-3.5 shrink-0 opacity-60"
                                  aria-hidden
                                />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                      <SidebarPeopleSection
                        pathname={pathname}
                        searchParams={searchParams}
                        onNavClick={handleNavLinkClick}
                      />
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ) : null}
            </>
          )}
        </SidebarMenu>
      </nav>
    </div>
  )
}
