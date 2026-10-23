import { cellString } from "./admin-entity-admin-cell"
import { formatAdminEntityListCellDisplay } from "./admin-entity-list-display-format"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/**
 * Resolves the related entity column used for a single `labelColumnKeys` entry on
 * {@link AdminEntityColumn.listVirtualRelationLabel} (for list display formatting).
 */
export function resolveRelatedColumnForVirtualRelationLabel(
  listCols: readonly AdminEntityColumn[],
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>,
  sourceColumnKey: string,
  labelColumnKey: string,
): AdminEntityColumn | undefined {
  const src = listCols.find((c) => c.key === sourceColumnKey)
  const relSlug = src?.listRelation?.relatedEntitySlug
  if (relSlug === undefined || relSlug === "") return undefined
  const related = adminEntities[relSlug] as AdminEntityDefinition | undefined
  return related?.columns.find((c) => c.key === labelColumnKey)
}

/**
 * Formats one embedded value for a virtual relation-label cell. Uses
 * {@link formatAdminEntityListCellDisplay} with the **related** column’s metadata when known
 * (e.g. `dateStringFormControl: "calendar"` → same **Mar 16, 2026** style as that entity’s list).
 */
export function formatAdminEntityVirtualRelationLabelValue(
  raw: unknown,
  relatedColumn: AdminEntityColumn | undefined,
): string {
  if (relatedColumn != null) {
    return formatAdminEntityListCellDisplay(raw, relatedColumn)
  }
  return cellString(raw)
}
