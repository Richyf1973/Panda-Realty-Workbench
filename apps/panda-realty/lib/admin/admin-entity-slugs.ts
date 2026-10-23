import {
  adminEntities,
  type AdminEntitySlug,
  type AdminPageEntitySlug,
} from "@/lib/admin/admin-entities-bundled"

export type { AdminEntitySlug, AdminPageEntitySlug }

export const ADMIN_ENTITY_SLUGS: readonly AdminEntitySlug[] = Object.keys(
  adminEntities,
) as AdminEntitySlug[]

export const ADMIN_PAGE_ENTITY_SLUGS: readonly AdminPageEntitySlug[] =
  ADMIN_ENTITY_SLUGS.filter(
    (s): s is AdminPageEntitySlug => adminEntities[s].adminPage === true,
  )

export function isAdminEntitySlug(s: string): s is AdminEntitySlug {
  return Object.hasOwn(adminEntities, s)
}

export function isAdminPageSlug(s: string): s is AdminPageEntitySlug {
  return isAdminEntitySlug(s) && adminEntities[s].adminPage === true
}
