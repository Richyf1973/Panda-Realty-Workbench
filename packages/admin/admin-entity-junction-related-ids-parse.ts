const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function junctionRelatedIdStringIsUuid(s: string): boolean {
  return UUID_RE.test(s.trim())
}

export type ParsedJunctionRelatedIds =
  | { ok: true; relatedIdValueType: "integer"; ids: number[] }
  | { ok: true; relatedIdValueType: "uuid"; ids: string[] }
  | { ok: false; errorMessage: string }

/**
 * Parse JSON body value for `tagIds`-style junction sync arrays (admin POST/PATCH).
 */
export function parseJunctionRelatedIdsArray(
  raw: unknown,
  fieldName: string,
  idValueType: "integer" | "uuid",
): ParsedJunctionRelatedIds {
  const badKind =
    idValueType === "uuid"
      ? "an array of UUID strings"
      : "an array of integers"

  if (raw === undefined) {
    return idValueType === "uuid"
      ? { ok: true, relatedIdValueType: "uuid", ids: [] }
      : { ok: true, relatedIdValueType: "integer", ids: [] }
  }
  if (raw === null) {
    return { ok: false, errorMessage: `${fieldName} must be ${badKind}` }
  }
  if (!Array.isArray(raw)) {
    return { ok: false, errorMessage: `${fieldName} must be ${badKind}` }
  }

  if (idValueType === "integer") {
    const ids: number[] = []
    for (const item of raw) {
      if (typeof item === "number" && Number.isInteger(item)) {
        ids.push(item)
        continue
      }
      if (typeof item === "string" && /^\d+$/.test(item)) {
        const n = Number.parseInt(item, 10)
        if (Number.isSafeInteger(n)) ids.push(n)
        continue
      }
      return { ok: false, errorMessage: `${fieldName} must be ${badKind}` }
    }
    return {
      ok: true,
      relatedIdValueType: "integer",
      ids: [...new Set(ids)].sort((a, b) => a - b),
    }
  }

  const uuids: string[] = []
  for (const item of raw) {
    if (typeof item !== "string") {
      return { ok: false, errorMessage: `${fieldName} must be ${badKind}` }
    }
    const t = item.trim()
    if (!junctionRelatedIdStringIsUuid(t)) {
      return { ok: false, errorMessage: `${fieldName} must be ${badKind}` }
    }
    uuids.push(t.toLowerCase())
  }
  return {
    ok: true,
    relatedIdValueType: "uuid",
    ids: [...new Set(uuids)].sort((a, b) => a.localeCompare(b)),
  }
}
