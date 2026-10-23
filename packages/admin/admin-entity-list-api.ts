/**
 * **Client-safe** admin entity list API shapes (GET `/api/admin/[entity]`).
 * No server-only imports — safe for `"use client"` and tests.
 *
 * Cards (and other entities with `listRelation` / `listManyRelation`) add embedded JSON
 * on each list item; see `docs/admin-api.md`.
 */
export const ADMIN_ENTITY_LIST_MAX_LIMIT = 100

/**
 * Absolute server ceiling for an opt-in all-pages relation option preload (`relationPreloadAllUtc=1`).
 * Normal list requests are still capped at {@link ADMIN_ENTITY_LIST_MAX_LIMIT} by the route; this only
 * lets a single preload request pull the whole option set (e.g. ~1.6k items) in one query.
 */
export const ADMIN_ENTITY_LIST_PRELOAD_ALL_MAX_LIMIT = 5000

export type AdminEntityListResponse = {
  items: Record<string, unknown>[]
  totalCount: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
  /** Set for page-based requests when the server clamped or confirmed the page index. */
  effectivePage?: number
  /**
   * Present when the entity defines `listAggregateSumColumnKeys`: sums over all rows matching list filters
   * (not page-limited). Values are decimal strings, consistent with numeric fields in `items`.
   */
  listAggregateSums?: Record<string, string>
}
