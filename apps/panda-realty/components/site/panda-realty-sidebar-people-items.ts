import { Home, KeyRound, Phone, UserCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type PeopleNavItem = {
  readonly href: string
  readonly label: string
  readonly testId: string
  readonly Icon: LucideIcon
  readonly activeEntityCategoryId?: string
}

const ENTITIES_ADMIN_HREF = "/admin/entities"

export const PEOPLE_NAV_ITEMS: readonly PeopleNavItem[] = [
  {
    href: "/admin/sellers",
    label: "Sellers",
    testId: "admin-layout-nav-link--sellers",
    Icon: Home,
  },
  {
    href: `${ENTITIES_ADMIN_HREF}?entityCategoryId=1`,
    label: "Buyers",
    testId: "admin-layout-nav-link--buyers",
    Icon: UserCheck,
    activeEntityCategoryId: "1",
  },
  {
    // Dedicated Contacts page (separate contact search, incl. representatives).
    href: "/admin/contacts",
    label: "Contacts",
    testId: "admin-layout-nav-link--contacts",
    Icon: Phone,
  },
  {
    href: `${ENTITIES_ADMIN_HREF}?entityCategoryId=3`,
    label: "Tenants",
    testId: "admin-layout-nav-link--tenants",
    Icon: KeyRound,
    activeEntityCategoryId: "3",
  },
]

export function isPeopleItemActive(
  pathname: string | null,
  searchParams: URLSearchParams,
  item: PeopleNavItem,
): boolean {
  if (!pathname) return false
  if (item.activeEntityCategoryId) {
    return (
      pathname === ENTITIES_ADMIN_HREF &&
      searchParams.get("entityCategoryId") === item.activeEntityCategoryId
    )
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
