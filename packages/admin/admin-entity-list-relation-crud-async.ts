import type { AdminEntityColumn } from "./admin-entity-types"

/** True when the main CRUD dialog uses server typeahead instead of a capped Select. */
export function adminEntityListRelationUsesCrudAsyncSearch(
  col: AdminEntityColumn,
): boolean {
  return (
    col.listRelation?.crudFormUiVariant === "asyncSearch" ||
    col.listRelation?.crudFormUiVariant === "preloadedSearch"
  )
}
