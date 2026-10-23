export { frontendConfig } from "@/lib/config/frontend"
export {
  adminEntities,
  adminEntityListColumns,
  adminEntitySlugExposesApi,
  adminNavItems,
  adminPageEntitySlugs,
  type AdminEntityConfig,
  type AdminEntitySlug,
  type AdminPageEntitySlug,
} from "@/lib/admin/admin-entities-bundled"
export {
  ADMIN_ENTITY_SLUGS,
  ADMIN_PAGE_ENTITY_SLUGS,
  isAdminEntitySlug,
  isAdminPageSlug,
} from "@/lib/admin/admin-entity-slugs"
export {
  adminEntityTables,
  type AdminEntityPgTable,
} from "@/lib/admin/admin-entity-tables"
export { loadAdminEntityDefinition } from "@/lib/admin/admin-entity-load-definition"
