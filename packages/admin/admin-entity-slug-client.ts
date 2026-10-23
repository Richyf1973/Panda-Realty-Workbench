/**
 * Client Component slug param type. Each app narrows literals in `admin-entity-slugs.ts`
 * (server); client bundles must not import `@admin-context` (Turbopack / RSC boundaries).
 */
export type AdminEntitySlug = string
