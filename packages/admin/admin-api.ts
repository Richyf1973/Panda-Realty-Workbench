import type { AdminEntityDefinition } from "./admin-entity-types"

export type { AdminEntityRegistry } from "./admin-entity-types"

// Re-exports for consumers that import from this module
export { adminJsonError, AdminHttpError } from "./admin-api-error"
export {
  isUuidParam,
  isPositiveIntegerIdParam,
  ADMIN_ENTITY_TEXT_ID_PARAM_MAX_LEN,
  isValidAdminEntityTextIdParam,
  isValidAdminEntityIdParam,
} from "./admin-entity-id-validation"
export {
  parseAdminEntityCreateBodyFromUnknown,
  parseAdminEntityCreateBody,
  parseAdminEntityPatchBodyFromUnknown,
  parseAdminEntityPatchBody,
  type AdminEntityCreateParseResult,
  type AdminEntityPatchParseResult,
} from "./admin-entity-body-parse"

export type AdminEntityFieldsParamResult =
  | { ok: true; fields: Set<string> | null }
  | { ok: false; unknownField: string }

/**
 * Parse `?fields=` query param. Returns `null` fields when `raw` is null (no filtering).
 * Always injects the entity's `idColumn.jsonKey`. Returns error on unknown field name.
 */
export function parseAdminEntityFieldsParam(
  entity: AdminEntityDefinition,
  raw: string | null,
): AdminEntityFieldsParamResult {
  if (raw === null || raw === "") {
    return { ok: true, fields: null }
  }
  const validKeys = new Set(entity.columns.map((c) => c.key))
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  for (const field of requested) {
    if (!validKeys.has(field)) {
      return { ok: false, unknownField: field }
    }
  }
  return { ok: true, fields: new Set([entity.idColumn.jsonKey, ...requested]) }
}
