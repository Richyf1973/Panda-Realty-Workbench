import { describe, expect, it } from "vitest"

import { resolveListFilterBypass } from "./admin-entity-list-filter-bypass"
import type { AdminEntityDefinition } from "./admin-entity-types"

/** Minimal cfg shim — only the field under test matters here. */
function cfgWithRules(
  rules: AdminEntityDefinition["listFiltersBypassedByAppendWhereHint"],
): AdminEntityDefinition {
  return { listFiltersBypassedByAppendWhereHint: rules } as AdminEntityDefinition
}

const STREET_FILTER_RULES = [
  {
    whenHintPresent: "streetFilter",
    bypassBooleanFilter: true,
    bypassRelationFilterColumnKeys: ["propertyStatusId"],
  },
] as const

describe("resolveListFilterBypass", () => {
  it("bypasses favourites + status when the streetFilter hint is present", () => {
    const result = resolveListFilterBypass(cfgWithRules(STREET_FILTER_RULES), {
      streetFilter: "main street~QLD",
    })
    expect(result.bypassBooleanFilter).toBe(true)
    expect([...result.bypassedRelationColumnKeys]).toEqual(["propertyStatusId"])
  })

  it("does not bypass when the hint is absent", () => {
    const result = resolveListFilterBypass(cfgWithRules(STREET_FILTER_RULES), {
      suburb: "Foo||QLD",
    })
    expect(result.bypassBooleanFilter).toBe(false)
    expect(result.bypassedRelationColumnKeys.size).toBe(0)
  })

  it("treats a blank/whitespace hint value as absent", () => {
    const result = resolveListFilterBypass(cfgWithRules(STREET_FILTER_RULES), {
      streetFilter: "   ",
    })
    expect(result.bypassBooleanFilter).toBe(false)
    expect(result.bypassedRelationColumnKeys.size).toBe(0)
  })

  it("returns no bypass when the entity declares no rules", () => {
    const result = resolveListFilterBypass(cfgWithRules(undefined), {
      streetFilter: "main street~QLD",
    })
    expect(result.bypassBooleanFilter).toBe(false)
    expect(result.bypassedRelationColumnKeys.size).toBe(0)
  })

  it("unions relation keys across multiple firing rules", () => {
    const result = resolveListFilterBypass(
      cfgWithRules([
        { whenHintPresent: "streetFilter", bypassRelationFilterColumnKeys: ["a"] },
        {
          whenHintPresent: "suburb",
          bypassBooleanFilter: true,
          bypassRelationFilterColumnKeys: ["b"],
        },
      ]),
      { streetFilter: "x", suburb: "y" },
    )
    expect(result.bypassBooleanFilter).toBe(true)
    expect([...result.bypassedRelationColumnKeys].sort()).toEqual(["a", "b"])
  })
})
