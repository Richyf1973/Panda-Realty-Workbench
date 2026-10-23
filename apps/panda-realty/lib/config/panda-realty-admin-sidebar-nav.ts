import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  FileText,
  Home,
  Image,
  LayoutGrid,
  ListChecks,
  MapPin,
  Megaphone,
  SendHorizonal,
  Tag,
  Tags,
  UserCheck,
  UserCircle,
  Users,
} from "lucide-react"

/**
 * Panda Realty admin sidebar icon per `/admin/[slug]` page.
 * Includes bundled entity pages plus custom admin pages such as `/admin/email-signatures`.
 */
export const pandaRealtyAdminSidebarIconsBySlug = {
  "email-signatures": Image,
  agents: UserCircle,
  "buyer-status": UserCheck,
  "buyer-requirement": ListChecks,
  "contact-categories": Tags,
  contacts: Contact,
  entities: Users,
  "event-timelines": ClipboardList,
  events: CalendarDays,
  "lead-sources": Megaphone,
  properties: Home,
  "property-types": Tag,
  suburbs: MapPin,
  "property-status": Building2,
  "address-type-conversions": ArrowLeftRight,
  "property-forms": FileText,
  "property-form-sends": SendHorizonal,
} as const satisfies Record<string, LucideIcon>

export function getPandaRealtyAdminSidebarIconForSlug(slug: string): LucideIcon {
  const map = pandaRealtyAdminSidebarIconsBySlug as Record<string, LucideIcon>
  return map[slug] ?? LayoutGrid
}
