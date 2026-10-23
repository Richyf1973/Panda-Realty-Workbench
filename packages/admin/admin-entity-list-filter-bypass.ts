import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * Resolve which generic list filters to suppress for a request, given the entity's
 * {@link AdminEntityDefinition.listFiltersBypassedByAppendWhereHint} rules and the active
 * append-where hints. A rule fires when its `whenHintPresent` hint is present and non-empty —
 * e.g. a map-area `streetFilter` bypassing the favourites toggle and the Status filter so the
 * map's street results are not silently narrowed.
 */
export function resolveListFilterBypass(
  cfg: AdminEntityDefinition,
  appendListWhereHints: Readonly<Record<string, string>> | undefined,
): { bypassBooleanFilter: boolean; bypassedRelationColumnKeys: Set<string> } {
  const activeRules = cfg.listFiltersBypassedByAppendWhereHint?.filter((rule) => {
    const hintVal = appendListWhereHints?.[rule.whenHintPresent]
    return typeof hintVal === "string" && hintVal.trim() !== ""
  })
  return {
    bypassBooleanFilter:
      activeRules?.some((rule) => rule.bypassBooleanFilter === true) ?? false,
    bypassedRelationColumnKeys: new Set(
      activeRules?.flatMap((rule) => rule.bypassRelationFilterColumnKeys ?? []) ?? [],
    ),
  }
}
