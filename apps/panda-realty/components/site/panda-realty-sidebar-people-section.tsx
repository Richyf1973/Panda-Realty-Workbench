"use client"

import Link from "next/link"

import { SidebarMenuSubButton, SidebarMenuSubItem } from "@repo/ui/sidebar"
import { cn } from "@repo/ui/utils"

import { PEOPLE_NAV_ITEMS, isPeopleItemActive } from "./panda-realty-sidebar-people-items"

type Props = {
  pathname: string | null
  searchParams: URLSearchParams
  onNavClick: () => void
}

export function SidebarPeopleSection({ pathname, searchParams, onNavClick }: Props) {
  return (
    <div data-testid="admin-sidebar-people-section" className="mt-2">
      <div className="mb-1 flex items-center gap-2">
        <hr className="flex-1 border-sidebar-border/60" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          People
        </span>
        <hr className="flex-1 border-sidebar-border/60" />
      </div>
      {PEOPLE_NAV_ITEMS.map((item) => {
        const active = isPeopleItemActive(pathname, searchParams, item)
        const { Icon } = item
        return (
          <SidebarMenuSubItem key={item.testId}>
            <SidebarMenuSubButton
              asChild
              size="md"
              isActive={active}
              className={cn("gap-3 rounded-md py-2 pr-1 pl-1", active && "font-medium")}
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-testid={item.testId}
                className="flex min-w-0 items-center gap-3"
                onClick={onNavClick}
              >
                <Icon className="size-3.5 shrink-0 opacity-60" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      })}
    </div>
  )
}
