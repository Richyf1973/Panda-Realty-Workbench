import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"

import { adminEntities } from "@/lib/admin/admin-entities-bundled"
import { isAdminEntitySlug } from "@/lib/admin/admin-entity-slugs"

export async function loadAdminEntityDefinition(
  slug: string,
): Promise<AdminEntityDefinition> {
  if (!isAdminEntitySlug(slug)) {
    throw new Error(`Unknown admin entity slug: ${slug}`)
  }
  return adminEntities[slug]
}
