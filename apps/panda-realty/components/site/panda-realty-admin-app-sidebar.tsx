"use client"

import Link from "next/link"
import { Home, Building2 } from "lucide-react"

import { PandaRealtySidebarNav } from "@/components/site/panda-realty-sidebar-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@repo/ui/sidebar"

export function PandaRealtyAdminAppSidebar({
  canAccessAdmin,
}: {
  canAccessAdmin: boolean
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const handleNavLinkClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      data-testid="admin-app-sidebar"
      className="border-r border-sidebar-border/60"
    >
      <SidebarHeader className="flex h-14 min-h-14 shrink-0 items-center border-b border-sidebar-border/60 bg-sidebar-accent/25 px-3 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <SidebarMenu className="box-border flex h-full w-full min-w-0 flex-col justify-center py-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-1.5">
          <SidebarMenuItem className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-11 max-h-11 gap-3 px-0.5 group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:max-h-8 group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:justify-center"
            >
              <Link
                href="/"
                className="flex w-full min-h-0 min-w-0 items-center gap-3 font-semibold tracking-tight group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:max-w-8 group-data-[collapsible=icon]:shrink-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0"
                data-testid="admin-sidebar-app-title"
                onClick={handleNavLinkClick}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary group-data-[collapsible=icon]:size-8">
                  <Building2 className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 truncate group-data-[collapsible=icon]:hidden">
                  Panda Realty
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <PandaRealtySidebarNav canAccessAdmin={canAccessAdmin} />
      </SidebarContent>
      <SidebarSeparator className="mx-2 bg-sidebar-border/60" />
      <SidebarFooter className="px-2 pb-3 pt-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-2 group-data-[collapsible=icon]:pt-2">
        <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              asChild
              tooltip="Home"
              className="gap-0 px-1.5 py-2 group-data-[collapsible=icon]:justify-center"
            >
              <Link
                href="/"
                data-testid="admin-layout-home-link"
                className="flex w-full min-h-0 min-w-0 items-center gap-3 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:max-w-8 group-data-[collapsible=icon]:shrink-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0 [&_svg]:shrink-0"
                onClick={handleNavLinkClick}
              >
                <Home className="opacity-70" aria-hidden />
                <span className="min-w-0 truncate font-medium group-data-[collapsible=icon]:hidden">
                  Home
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
