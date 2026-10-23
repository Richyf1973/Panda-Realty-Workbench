export type {
  AdminDocColumn,
  AdminEntityColumn,
  AdminEntityColumnListManyRelation,
  AdminEntityColumnManyRelationForm,
  AdminEntityCrudRelatedCollection,
  AdminEntityDefinition,
  AdminEntityJunctionSyncOp,
  AdminEntityIdColumn,
  AdminEntityListBooleanFilter,
  AdminEntityListRelationFilterSpec,
  AdminEntityListSearch,
  AdminEntityUi,
  AdminValueType,
  ListOrderSpec,
} from "@repo/admin/admin-entity-types"

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
