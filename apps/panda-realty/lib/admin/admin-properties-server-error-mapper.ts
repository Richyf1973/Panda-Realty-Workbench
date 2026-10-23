import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"

/**
 * Maps a server mutation error message to per-field errors for the properties
 * entity. Matches patterns like "Commission rate must be numeric" by scanning
 * each column's label.
 *
 * Returns `undefined` when the message doesn't match any column label pattern,
 * so the generic footer error is shown instead.
 */
export function mapPropertiesServerErrorToFields(
  error: Error,
  entityDefinition: AdminEntityDefinition,
): Record<string, string> | undefined {
  const msg = error.message
  for (const col of entityDefinition.columns) {
    if (msg.startsWith(col.label + " must be")) {
      return { [col.key]: msg }
    }
  }
  return undefined
}
