import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/**
 * Returns a shallow copy of **`def`** safe to pass from a React Server Component into a Client
 * Component (e.g. {@link AdminEntityPageShell} → `AdminEntityAdmin`). Drops non-serializable
 * callbacks such as **`listRelation.crudAsyncSearchCreateRelated.onBeforeCreate`**.
 *
 * Client code should prefer the full definition from **`useAdminClientRegistry().adminEntities`**
 * when available so behavior (e.g. `onBeforeCreate`) is restored after hydration.
 */
export function stripAdminEntityDefinitionForRscProps(
  def: AdminEntityDefinition,
): AdminEntityDefinition {
  return {
    ...def,
    columns: def.columns.map(stripColumnForRsc) as AdminEntityDefinition["columns"],
  }
}

function stripColumnForRsc(col: AdminEntityColumn): AdminEntityColumn {
  const lr = col.listRelation
  const cr = lr?.crudAsyncSearchCreateRelated
  if (lr == null || cr == null || cr.onBeforeCreate == null) {
    return col
  }
  const { onBeforeCreate: _omit, ...crRest } = cr
  return {
    ...col,
    listRelation: {
      ...lr,
      crudAsyncSearchCreateRelated: crRest,
    },
  }
}
