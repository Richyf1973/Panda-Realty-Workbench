import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * When true, narrow or short admin viewports (see `useCompactAdminListViewport` in `@repo/ui`)
 * should not allow CRUD mutations: fields read-only, Save/Create hidden, related inline tables read-only.
 *
 * Default is **editable** on compact viewports. Opt in to read-only per entity with
 * {@link AdminEntityDefinition.crudCompactViewport} **`"locked"`**.
 */
export function adminEntityLocksCrudOnCompactViewport(
  entityDefinition: Pick<AdminEntityDefinition, "crudCompactViewport">,
): boolean {
  return entityDefinition.crudCompactViewport === "locked"
}
