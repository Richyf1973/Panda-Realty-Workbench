import type {
  AdminEntityListServerContext,
  AdminEntityQueryServerContext,
} from "@repo/admin/admin-entity-types"

import { adminEntities } from "@/lib/admin/admin-entities-bundled"
import { adminEntityTables } from "@/lib/admin/admin-entity-tables"
import { frontendConfig } from "@/lib/config/frontend"
import { adminEntityQueryExtrasHandlers } from "@/lib/admin/admin-entity-query-extras.server"
import { pandaPropertiesAppendListWhere } from "@/lib/admin/panda-properties-list-append-where.server"

// Entity category IDs — stable lookup values from panda_realty.entity_categories
// buyer=1, seller=2, tenant=3, contact=4
const CATEGORY_SELLER = 2
const CATEGORY_BUYER = 1
const CATEGORY_TENANT = 3
const CATEGORY_CONTACT = 4

export const adminEntityListContextCore: Omit<
  AdminEntityListServerContext,
  "db"
> = {
  entities: adminEntities,
  tables: adminEntityTables,
  frontendConfig,
  appendListWhere: pandaPropertiesAppendListWhere,
}

export const adminEntityQueryContextCore: Omit<
  AdminEntityQueryServerContext,
  "db"
> = {
  entities: adminEntities,
  tables: adminEntityTables,
  ...adminEntityQueryExtrasHandlers,
  mergeAdminEntityDetailForApi: async ({ slug, detail }) => {
    if (slug !== "properties") return detail
    const all = Array.isArray(detail.propertyEntities)
      ? (detail.propertyEntities as Record<string, unknown>[])
      : []
    const byCategoryId = (id: number) =>
      all.filter(
        (r) =>
          (r.propertyEntity as Record<string, unknown> | undefined)
            ?.entityCategoryId === id,
      )
    return {
      ...detail,
      propertyBuyers: byCategoryId(CATEGORY_BUYER),
      propertyContacts: byCategoryId(CATEGORY_CONTACT),
      propertyTenants: byCategoryId(CATEGORY_TENANT),
    }
  },
}
