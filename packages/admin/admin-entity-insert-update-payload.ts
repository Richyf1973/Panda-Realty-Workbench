import type { AdminEntityColumn, AdminEntityQueryServerContext } from "./admin-entity-types"

/**
 * Drizzle PG `timestamp` columns expect `Date` (or SQL); ISO strings from the admin JSON API
 * are not accepted and can throw `value.toISOString is not a function` inside the driver.
 */
export function adminEntityTimestampStringToDateForDb(
  slug: string,
  columnKey: string,
  raw: string,
): Date {
  const d = new Date(raw.trim())
  if (Number.isNaN(d.getTime())) {
    throw new Error(
      `[adminEntityTimestampStringToDateForDb] ${slug}.${columnKey}: invalid timestamp: ${JSON.stringify(raw.trim())}`,
    )
  }
  return d
}

export function buildAdminEntityInsertPayload(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  values: Record<string, string>,
): Record<string, unknown> {
  const cfg = ctx.entities[slug]
  if (!cfg) {
    throw new Error(`[buildAdminEntityInsertPayload] unknown entity: ${slug}`)
  }
  const payload: Record<string, unknown> = {}
  const cols = cfg.columns as readonly AdminEntityColumn[]
  for (const col of cols.filter((c) => c.create && !c.listVirtual)) {
    const raw = values[col.key]
    if (raw === undefined) continue
    if (col.valueType === "boolean") {
      payload[col.key] = raw.trim().toLowerCase() === "true"
    } else if (col.valueType === "timestamp") {
      payload[col.key] = adminEntityTimestampStringToDateForDb(
        slug,
        col.key,
        raw,
      )
    } else {
      payload[col.key] = raw
    }
  }
  return payload
}

export function buildAdminEntityUpdatePayload(
  ctx: AdminEntityQueryServerContext,
  slug: string,
  patch: Record<string, string>,
): Record<string, unknown> {
  const cfg = ctx.entities[slug]
  if (!cfg) {
    throw new Error(`[buildAdminEntityUpdatePayload] unknown entity: ${slug}`)
  }
  const payload: Record<string, unknown> = {}
  const cols = cfg.columns as readonly AdminEntityColumn[]
  const patchCols = cols.filter((c) => c.patch && !c.listVirtual)
  const patchKeys = new Set(patchCols.map((c) => c.key)) as Set<string>
  const clearsToNull = new Set(
    patchCols.filter((c) => c.patchEmptyClears).map((c) => c.key),
  ) as Set<string>
  const colByKey = new Map(patchCols.map((c) => [c.key, c] as const))
  for (const [k, v] of Object.entries(patch)) {
    if (!patchKeys.has(k)) continue
    const col = colByKey.get(k)
    if (col?.valueType === "boolean") {
      if (clearsToNull.has(k) && v === "") {
        payload[k] = null
      } else {
        payload[k] = v.trim().toLowerCase() === "true"
      }
      continue
    }
    if (clearsToNull.has(k) && v === "") {
      payload[k] = null
    } else if (col?.valueType === "timestamp") {
      payload[k] = adminEntityTimestampStringToDateForDb(slug, k, v)
    } else {
      payload[k] = v
    }
  }
  return payload
}
