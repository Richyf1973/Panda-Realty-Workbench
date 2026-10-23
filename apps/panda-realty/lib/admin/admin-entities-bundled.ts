import type {
  AdminDocColumn,
  AdminEntityColumn,
  AdminEntityDefinition,
} from "@repo/admin/admin-entity-types"
import { adminEntitiesTable } from "@/lib/admin/admin-entities-registry.generated"

export type AdminEntitySlug = keyof typeof adminEntitiesTable

export type AdminPageEntitySlug = {
  [K in AdminEntitySlug]: (typeof adminEntitiesTable)[K]["adminPage"] extends true
    ? K
    : never
}[AdminEntitySlug]

export const adminEntities = adminEntitiesTable

export type AdminEntityConfig = (typeof adminEntities)[AdminEntitySlug]

export function adminEntitySlugExposesApi(slug: AdminEntitySlug): boolean {
  return (adminEntities[slug] as AdminEntityDefinition).adminApi !== false
}

export function adminPageEntitySlugs(): AdminPageEntitySlug[] {
  return (Object.keys(adminEntities) as AdminEntitySlug[]).filter(
    (s): s is AdminPageEntitySlug => adminEntities[s].adminPage === true,
  )
}

export const adminNavItems = adminPageEntitySlugs().map(
  (slug: AdminPageEntitySlug) => ({
    href: `/admin/${slug}`,
    label: adminEntities[slug].nav.label,
  }),
) as { href: `/admin/${AdminPageEntitySlug}`; label: string }[]

export function adminEntityListColumns(slug: AdminEntitySlug): AdminDocColumn[] {
  return adminEntities[slug].columns.filter(
    (c: AdminEntityColumn): c is AdminDocColumn => c.list,
  )
}

export type { AdminDocColumn, AdminEntityColumn, AdminEntityDefinition }
