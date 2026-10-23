import { describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({ NextResponse: { json: vi.fn() } }))

import {
  ADMIN_ENTITY_TEXT_ID_PARAM_MAX_LEN,
  isValidAdminEntityIdParam,
  isValidAdminEntityTextIdParam,
  parseAdminEntityCreateBodyFromUnknown,
  parseAdminEntityFieldsParam,
  parseAdminEntityPatchBodyFromUnknown,
} from "./admin-api"
import type { AdminEntityDefinition } from "./admin-entity-types"

const textFormOptionsDemoEntity = {
  adminPage: true,
  slug: "text-form-options-demo",
  schemaSqlName: "public.demo_text_enum",
  apiBase: "/api/admin/demo",
  queryKey: ["admin", "demo"] as const,
  nav: { label: "Demo" },
  metadataTitle: "Demo",
  idColumn: { jsonKey: "code", valueType: "text" as const },
  deleteLabelColumnKey: "code",
  columns: [
    {
      key: "code",
      sqlName: "code",
      label: "Code",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: false,
      sortable: false,
    },
    {
      key: "tier",
      sqlName: "tier",
      label: "Tier",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: false,
      textFormOptions: [
        { value: "A", label: "A" },
        { value: "B", label: "B" },
      ] as const,
    },
  ],
  listOrderBy: [{ columnKey: "code", direction: "asc" as const }],
  ui: {
    title: "Demo",
    singular: "demo",
    addCardTitle: "Add",
    listTitle: "All",
    loadErrorLabel: "Err",
    emptyLabel: "Empty",
  },
} as const satisfies AdminEntityDefinition

const textFormOptionsDemoRegistry = {
  "text-form-options-demo": textFormOptionsDemoEntity,
} as const

const numericSanitizeDemoEntity = {
  adminPage: true,
  slug: "numeric-sanitize-demo",
  schemaSqlName: "public.demo_numeric",
  apiBase: "/api/admin/demo-num",
  queryKey: ["admin", "demo-num"] as const,
  nav: { label: "Demo num" },
  metadataTitle: "Demo num",
  idColumn: { jsonKey: "id", valueType: "integer" as const },
  deleteLabelColumnKey: "id",
  columns: [
    {
      key: "id",
      sqlName: "id",
      label: "ID",
      valueType: "integer" as const,
      list: true,
      create: false,
      patch: false,
      sortable: false,
    },
    {
      key: "amount",
      sqlName: "amount",
      label: "Amount",
      valueType: "numeric" as const,
      list: true,
      create: true,
      patch: true,
      sortable: false,
    },
  ],
  listOrderBy: [{ columnKey: "id", direction: "asc" as const }],
  ui: {
    title: "Demo",
    singular: "demo",
    addCardTitle: "Add",
    listTitle: "All",
    loadErrorLabel: "Err",
    emptyLabel: "Empty",
  },
} as const satisfies AdminEntityDefinition

const numericSanitizeDemoRegistry = {
  "numeric-sanitize-demo": numericSanitizeDemoEntity,
} as const

const yearMonthEndDemoEntity = {
  adminPage: true,
  slug: "year-month-end-demo",
  schemaSqlName: "public.demo_ym_end",
  apiBase: "/api/admin/demo-ym",
  queryKey: ["admin", "demo-ym"] as const,
  nav: { label: "Demo ym" },
  metadataTitle: "Demo ym",
  idColumn: { jsonKey: "periodEnd", valueType: "text" as const },
  deleteLabelColumnKey: "periodEnd",
  columns: [
    {
      key: "periodEnd",
      sqlName: "period_end",
      label: "Period",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: false,
      sortable: false,
      dateStringFormControl: "yearMonthEnd" as const,
    },
  ],
  listOrderBy: [{ columnKey: "periodEnd", direction: "desc" as const }],
  ui: {
    title: "Demo",
    singular: "demo",
    addCardTitle: "Add",
    listTitle: "All",
    loadErrorLabel: "Err",
    emptyLabel: "Empty",
  },
} as const satisfies AdminEntityDefinition

const yearMonthEndDemoRegistry = {
  "year-month-end-demo": yearMonthEndDemoEntity,
} as const

describe("isValidAdminEntityTextIdParam", () => {
  it("accepts non-empty trimmed text within max length", () => {
    expect(isValidAdminEntityTextIdParam("ACME-001")).toBe(true)
    expect(isValidAdminEntityTextIdParam("  x  ")).toBe(true)
  })

  it("rejects empty, overlong, and NUL", () => {
    expect(isValidAdminEntityTextIdParam("")).toBe(false)
    expect(isValidAdminEntityTextIdParam("   ")).toBe(false)
    expect(
      isValidAdminEntityTextIdParam("a".repeat(ADMIN_ENTITY_TEXT_ID_PARAM_MAX_LEN + 1)),
    ).toBe(false)
    expect(isValidAdminEntityTextIdParam("a\0b")).toBe(false)
  })
})

describe("isValidAdminEntityIdParam (text)", () => {
  it("delegates to text rules", () => {
    expect(isValidAdminEntityIdParam("text", "SUP-1")).toBe(true)
    expect(isValidAdminEntityIdParam("text", "")).toBe(false)
  })
})

describe("parseAdminEntityCreateBodyFromUnknown (textFormOptions)", () => {
  it("accepts a value in the allowed set", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      textFormOptionsDemoRegistry,
      "text-form-options-demo",
      { code: "c1", tier: "B" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.tier).toBe("B")
  })

  it("rejects a value outside the allowed set", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      textFormOptionsDemoRegistry,
      "text-form-options-demo",
      { code: "c1", tier: "Z" },
    )
    expect(r.ok).toBe(false)
  })
})

describe("parseAdminEntityPatchBodyFromUnknown (textFormOptions)", () => {
  it("rejects patch value outside the allowed set", () => {
    const r = parseAdminEntityPatchBodyFromUnknown(
      textFormOptionsDemoRegistry,
      "text-form-options-demo",
      { tier: "Z" },
    )
    expect(r.ok).toBe(false)
  })

  it("accepts patch value in the allowed set", () => {
    const r = parseAdminEntityPatchBodyFromUnknown(
      textFormOptionsDemoRegistry,
      "text-form-options-demo",
      { tier: "A" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.patch.tier).toBe("A")
  })
})

describe("parseAdminEntityCreateBodyFromUnknown (yearMonthEnd)", () => {
  it("accepts YYYY-MM-DD when it is month-end", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      yearMonthEndDemoRegistry,
      "year-month-end-demo",
      { periodEnd: "2026-01-31" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.periodEnd).toBe("2026-01-31")
  })

  it("rejects mid-month dates", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      yearMonthEndDemoRegistry,
      "year-month-end-demo",
      { periodEnd: "2026-01-15" },
    )
    expect(r.ok).toBe(false)
  })
})

describe("parseAdminEntityCreateBodyFromUnknown (numeric grouping)", () => {
  it("normalizes comma-grouped decimal strings for create", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      numericSanitizeDemoRegistry,
      "numeric-sanitize-demo",
      { amount: "16,530.00" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.amount).toBe("16530.00")
  })
})

describe("parseAdminEntityPatchBodyFromUnknown (numeric grouping)", () => {
  it("normalizes comma-grouped decimal strings for patch", () => {
    const r = parseAdminEntityPatchBodyFromUnknown(
      numericSanitizeDemoRegistry,
      "numeric-sanitize-demo",
      { amount: "16,530.00" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.patch.amount).toBe("16530.00")
  })
})

// ─── Signed numeric (currencyAmountAllowLeadingMinus) ────────────────────────

const signedNumericDemoEntity = {
  adminPage: true,
  slug: "signed-numeric-demo",
  schemaSqlName: "public.demo_signed_numeric",
  apiBase: "/api/admin/demo-signed-num",
  queryKey: ["admin", "demo-signed-num"] as const,
  nav: { label: "Demo signed num" },
  metadataTitle: "Demo signed num",
  idColumn: { jsonKey: "id", valueType: "integer" as const },
  deleteLabelColumnKey: "id",
  columns: [
    {
      key: "id",
      sqlName: "id",
      label: "ID",
      valueType: "integer" as const,
      list: true,
      create: false,
      patch: false,
      sortable: false,
    },
    {
      key: "amount",
      sqlName: "amount",
      label: "Amount",
      valueType: "numeric" as const,
      currencySymbol: "₱" as const,
      currencyAmountAllowLeadingMinus: true as const,
      list: true,
      create: true,
      patch: true,
      sortable: false,
    },
  ],
  listOrderBy: [{ columnKey: "id", direction: "asc" as const }],
  ui: {
    title: "Demo signed",
    singular: "demo signed",
    addCardTitle: "Add",
    listTitle: "All",
    loadErrorLabel: "Err",
    emptyLabel: "Empty",
  },
} as const satisfies AdminEntityDefinition

const signedNumericDemoRegistry = {
  "signed-numeric-demo": signedNumericDemoEntity,
} as const

describe("parseAdminEntityCreateBodyFromUnknown (currencyAmountAllowLeadingMinus)", () => {
  it("accepts and preserves negative amount on create", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      signedNumericDemoRegistry,
      "signed-numeric-demo",
      { amount: "-350.50" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.amount).toBe("-350.50")
  })

  it("accepts and preserves negative integer-like amount on create", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      signedNumericDemoRegistry,
      "signed-numeric-demo",
      { amount: "-200" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.amount).toBe("-200")
  })

  it("accepts positive amount unchanged on create", () => {
    const r = parseAdminEntityCreateBodyFromUnknown(
      signedNumericDemoRegistry,
      "signed-numeric-demo",
      { amount: "6065.02" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.values.amount).toBe("6065.02")
  })

})

describe("parseAdminEntityPatchBodyFromUnknown (currencyAmountAllowLeadingMinus)", () => {
  it("accepts and preserves negative amount on patch", () => {
    const r = parseAdminEntityPatchBodyFromUnknown(
      signedNumericDemoRegistry,
      "signed-numeric-demo",
      { amount: "-200" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.patch.amount).toBe("-200")
  })

  it("accepts and preserves negative decimal amount on patch", () => {
    const r = parseAdminEntityPatchBodyFromUnknown(
      signedNumericDemoRegistry,
      "signed-numeric-demo",
      { amount: "-6065.02" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.patch.amount).toBe("-6065.02")
  })

  it("accepts positive amount unchanged on patch", () => {
    const r = parseAdminEntityPatchBodyFromUnknown(
      signedNumericDemoRegistry,
      "signed-numeric-demo",
      { amount: "1234.56" },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.patch.amount).toBe("1234.56")
  })

})

const fieldsTestEntity = {
  adminPage: true,
  slug: "fields-test",
  schemaSqlName: "public.fields_test",
  apiBase: "/api/admin/fields-test",
  queryKey: ["admin", "fields-test"] as const,
  nav: { label: "Fields Test" },
  metadataTitle: "Fields Test",
  idColumn: { jsonKey: "id", valueType: "integer" as const },
  deleteLabelColumnKey: "id",
  columns: [
    {
      key: "id",
      sqlName: "id",
      label: "ID",
      valueType: "integer" as const,
      list: true,
      create: false,
      patch: false,
      sortable: false,
    },
    {
      key: "name",
      sqlName: "name",
      label: "Name",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: false,
    },
    {
      key: "status",
      sqlName: "status",
      label: "Status",
      valueType: "text" as const,
      list: true,
      create: true,
      patch: true,
      sortable: false,
    },
  ],
  listOrderBy: [{ columnKey: "id", direction: "asc" as const }],
  ui: {
    title: "Fields Test",
    singular: "fields test",
    addCardTitle: "Add",
    listTitle: "All",
    loadErrorLabel: "Err",
    emptyLabel: "Empty",
  },
} as const satisfies AdminEntityDefinition

describe("parseAdminEntityFieldsParam", () => {
  it("null passthrough — raw null returns ok with null fields", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, null)
    expect(result).toEqual({ ok: true, fields: null })
  })

  it("empty string passthrough — raw empty string returns ok with null fields", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, "")
    expect(result).toEqual({ ok: true, fields: null })
  })

  it("unknown field — returns error with the unknown field name", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, "bogus")
    expect(result).toEqual({ ok: false, unknownField: "bogus" })
  })

  it("ID injection — id is always included even when not requested", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, "name")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields).toEqual(new Set(["id", "name"]))
    }
  })

  it("ID already requested — no duplication when id is explicitly in fields", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, "id,name")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields).toEqual(new Set(["id", "name"]))
      expect(result.fields?.size).toBe(2)
    }
  })

  it("multiple valid fields — returns all requested fields plus id", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, "name,status")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields).toEqual(new Set(["id", "name", "status"]))
    }
  })

  it("whitespace trimming — spaces around field names are ignored", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, " name , status ")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields).toEqual(new Set(["id", "name", "status"]))
    }
  })

  it("first unknown field wins — stops at the first unrecognized field", () => {
    const result = parseAdminEntityFieldsParam(fieldsTestEntity, "name,bogus,other")
    expect(result).toEqual({ ok: false, unknownField: "bogus" })
  })
})
