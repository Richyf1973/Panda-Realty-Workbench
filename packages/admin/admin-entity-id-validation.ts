import type { AdminValueType } from "./admin-entity-types"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidParam(id: string): boolean {
  return UUID_RE.test(id)
}

export function isPositiveIntegerIdParam(id: string): boolean {
  return /^\d+$/.test(id) && Number(id) <= Number.MAX_SAFE_INTEGER
}

/** Max length for `idColumn.valueType: "text"` route params (natural / string primary keys). */
export const ADMIN_ENTITY_TEXT_ID_PARAM_MAX_LEN = 500

export function isValidAdminEntityTextIdParam(id: string): boolean {
  if (id.length > ADMIN_ENTITY_TEXT_ID_PARAM_MAX_LEN) return false
  if (id.trim() === "") return false
  if (id.includes("\0")) return false
  return true
}

export function isValidAdminEntityIdParam(
  valueType: AdminValueType,
  id: string,
): boolean {
  if (valueType === "uuid") return isUuidParam(id)
  if (valueType === "integer") return isPositiveIntegerIdParam(id)
  if (valueType === "text") return isValidAdminEntityTextIdParam(id)
  return false
}
