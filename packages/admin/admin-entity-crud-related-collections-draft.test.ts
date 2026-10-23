import { describe, expect, it } from "vitest"

import {
  emptyDraftLine,
  lineIsEmptyForPersist,
  linesToExtrasPayload,
  mergeRelatedInlineDetailHydrateLines,
  normalizeAdminEntityIntegerLineFieldFromServer,
  normalizeTrailingDrafts,
  numericStringIsEffectivelyZero,
  serializeLineRowForExtrasPayload,
  serverRowsToLines,
} from "./admin-entity-crud-related-collections-draft"
import type { AdminEntityColumn, AdminEntityDefinition } from "./admin-entity-types"

/** Columns used by related-lines draft helpers; cast avoids a full entity fixture. */
const testChildCfg = {
  idColumn: { jsonKey: "lineId", valueType: "integer" },
  columns: [
    {
      key: "lineId",
      sqlName: "line_id",
      label: "ID",
      valueType: "integer",
    },
    {
      key: "voucherNo",
      sqlName: "voucher_no",
      label: "Voucher",
      valueType: "text",
    },
    {
      key: "amount",
      sqlName: "amount",
      label: "Amount",
      valueType: "numeric",
    },
  ],
} as unknown as AdminEntityDefinition

const editableKeys = ["voucherNo", "amount"] as const
const persistKey = "voucherNo"

describe("numericStringIsEffectivelyZero", () => {
  it("treats empty and numeric zeros as zero", () => {
    expect(numericStringIsEffectivelyZero("")).toBe(true)
    expect(numericStringIsEffectivelyZero("0")).toBe(true)
    expect(numericStringIsEffectivelyZero("0.0")).toBe(true)
    expect(numericStringIsEffectivelyZero("0.00")).toBe(true)
    expect(numericStringIsEffectivelyZero("-0")).toBe(true)
  })

  it("rejects non-zero and non-numeric strings", () => {
    expect(numericStringIsEffectivelyZero("1")).toBe(false)
    expect(numericStringIsEffectivelyZero("0.01")).toBe(false)
    expect(numericStringIsEffectivelyZero("abc")).toBe(false)
  })
})

describe("emptyDraftLine", () => {
  it("defaults numeric inline columns to 0", () => {
    const line = emptyDraftLine(testChildCfg, editableKeys)
    expect(line.amount).toBe("0")
    expect(line.voucherNo).toBeUndefined()
    expect(typeof line.clientKey).toBe("string")
  })
})

describe("lineIsEmptyForPersist", () => {
  it("treats a draft with only default zeros as empty when persist key is blank", () => {
    const line = emptyDraftLine(testChildCfg, editableKeys)
    const zeros = new Set<string>(["amount"])
    expect(lineIsEmptyForPersist(line, persistKey, zeros)).toBe(true)
  })

  it("is non-empty when persist key is set", () => {
    const line = { ...emptyDraftLine(testChildCfg, editableKeys), voucherNo: "V1" }
    const zeros = new Set<string>(["amount"])
    expect(lineIsEmptyForPersist(line, persistKey, zeros)).toBe(false)
  })

  it("treats persist key numeric 0 as empty when that column is a zero sentinel (e.g. offer-first rows)", () => {
    const amountOnlyKeys = ["amount"] as const
    const line = emptyDraftLine(testChildCfg, amountOnlyKeys)
    const zeros = new Set<string>(["amount"])
    expect(lineIsEmptyForPersist(line, "amount", zeros)).toBe(true)
  })

  it("is non-empty when persist key is numeric zero-sentinel but value is non-zero", () => {
    const zeros = new Set<string>(["amount"])
    const line = { clientKey: "k", amount: "50" }
    expect(lineIsEmptyForPersist(line, "amount", zeros)).toBe(false)
  })
})

describe("normalizeTrailingDrafts", () => {
  it("appends a new draft with numeric defaults after a non-empty last row", () => {
    const zeros = new Set<string>(["amount"])
    const filled: Parameters<typeof normalizeTrailingDrafts>[0] = [
      {
        clientKey: "a",
        voucherNo: "X",
        amount: "10",
        lineId: 1,
      },
    ]
    const next = normalizeTrailingDrafts(
      filled,
      persistKey,
      zeros,
      testChildCfg,
      editableKeys,
    )
    expect(next).toHaveLength(2)
    expect(next[1]!.amount).toBe("0")
    expect(lineIsEmptyForPersist(next[1]!, persistKey, zeros)).toBe(true)
  })

  it("does not append a new row on every keystroke when persistKey is the numeric column", () => {
    const zeros = new Set<string>(["amount"])
    const amountOnlyKeys = ["amount"] as const
    let lines: Parameters<typeof normalizeTrailingDrafts>[0] = [
      emptyDraftLine(testChildCfg, amountOnlyKeys),
    ]
    lines = normalizeTrailingDrafts(
      lines,
      "amount",
      zeros,
      testChildCfg,
      amountOnlyKeys,
    )
    expect(lines).toHaveLength(1)
    const firstKey = lines[0]!.clientKey
    const patchFirst = (
      rows: typeof lines,
      amount: string,
    ): typeof lines =>
      rows.map((l) =>
        l.clientKey === firstKey ? { ...l, amount } : l,
      )
    lines = normalizeTrailingDrafts(
      patchFirst(lines, "1"),
      "amount",
      zeros,
      testChildCfg,
      amountOnlyKeys,
    )
    expect(lines).toHaveLength(2)
    lines = normalizeTrailingDrafts(
      patchFirst(lines, "12"),
      "amount",
      zeros,
      testChildCfg,
      amountOnlyKeys,
    )
    expect(lines).toHaveLength(2)
    lines = normalizeTrailingDrafts(
      patchFirst(lines, "123"),
      "amount",
      zeros,
      testChildCfg,
      amountOnlyKeys,
    )
    expect(lines).toHaveLength(2)
  })
})

describe("normalizeAdminEntityIntegerLineFieldFromServer", () => {
  it("truncates high-precision numeric strings for plain integer columns", () => {
    expect(
      normalizeAdminEntityIntegerLineFieldFromServer(
        { valueType: "integer" },
        "1.0000000000",
      ),
    ).toBe("1")
  })

  it("does not rewrite integer FK fields that use listRelation", () => {
    const col = {
      valueType: "integer" as const,
      listRelation: {
        relatedEntitySlug: "denominations",
        embedJsonKey: "denominationRef",
        labelColumnKeys: ["denomination"] as const,
      },
    } satisfies Pick<AdminEntityColumn, "valueType" | "listRelation">
    expect(
      normalizeAdminEntityIntegerLineFieldFromServer(col, "1.0000000000"),
    ).toBe("1.0000000000")
  })
})

describe("serverRowsToLines", () => {
  it("normalizes plain integer columns from Postgres numeric scale", () => {
    const cfg = {
      ...testChildCfg,
      columns: [
        ...(testChildCfg as AdminEntityDefinition).columns,
        {
          key: "qty",
          sqlName: "qty",
          label: "Qty",
          valueType: "integer",
        },
      ],
    } as unknown as AdminEntityDefinition
    const lines = serverRowsToLines(
      [{ lineId: 1, voucherNo: "X", amount: "0", qty: "2.0000000000" }],
      cfg,
      ["voucherNo", "amount", "qty"],
    )
    expect(lines[0]!.qty).toBe("2")
  })

  it("copies readonly keys for display-only columns", () => {
    const cfgWithReadonly = {
      ...testChildCfg,
      columns: [
        ...(testChildCfg as AdminEntityDefinition).columns,
        {
          key: "extraSum",
          sqlName: "extra_sum",
          label: "Extra",
          valueType: "numeric",
        },
      ],
    } as unknown as AdminEntityDefinition
    const lines = serverRowsToLines(
      [{ lineId: 1, voucherNo: "X", amount: 5, extraSum: 12.5 }],
      cfgWithReadonly,
      ["voucherNo", "amount"],
      ["extraSum"],
    )
    expect(lines[0]!.extraSum).toBe("12.5")
    expect(lines[0]!.amount).toBe("5")
  })

  it("copies hydrate keys for virtual operands omitted from inline columns", () => {
    const cfg = {
      ...testChildCfg,
      columns: [
        ...(testChildCfg as AdminEntityDefinition).columns,
        {
          key: "parentFkCol",
          sqlName: "parent_fk_col",
          label: "Parent FK",
          valueType: "integer",
        },
      ],
    } as unknown as AdminEntityDefinition
    const lines = serverRowsToLines(
      [
        {
          lineId: 1,
          voucherNo: "X",
          amount: 5,
          parentFkCol: 99,
        },
      ],
      cfg,
      ["voucherNo", "amount"],
      [],
      ["parentFkCol"],
    )
    expect(lines[0]!.parentFkCol).toBe("99")
  })

  it("preserves structured values on hydrate keys without a column definition", () => {
    const nested = [{ cashCount: "2", denominationRef: { denomination: "100" } }]
    const lines = serverRowsToLines(
      [
        {
          lineId: 1,
          voucherNo: "X",
          amount: 5,
          nestedChild: nested,
        },
      ],
      testChildCfg,
      ["voucherNo", "amount"],
      [],
      ["nestedChild"],
    )
    expect(lines[0]!.nestedChild).toBe(nested)
  })
})

describe("linesToExtrasPayload", () => {
  it("serializes numeric amounts and skips blank persist rows", () => {
    const lines = [
      { clientKey: "1", voucherNo: "A", amount: "1.5" },
      emptyDraftLine(testChildCfg, editableKeys),
    ]
    const payload = linesToExtrasPayload(
      lines,
      testChildCfg,
      editableKeys,
      persistKey,
    )
    expect(payload).toEqual([{ voucherNo: "A", amount: "1.5" }])
  })

  it("with persistWhenAnyEditableContent, includes rows with only non-zero numeric when persist key is blank", () => {
    const zeros = new Set<string>(["amount"])
    const lines = [
      {
        clientKey: "1",
        voucherNo: "",
        amount: "25",
      },
      emptyDraftLine(testChildCfg, editableKeys),
    ]
    const payload = linesToExtrasPayload(
      lines,
      testChildCfg,
      editableKeys,
      persistKey,
      { zeroSentinelKeys: zeros, persistWhenAnyEditableContent: true },
    )
    expect(payload).toEqual([{ voucherNo: "", amount: "25" }])
  })

  it("merges extrasPayloadKeys (e.g. read-only rounded amount) into POST rows", () => {
    const payrollLikeCfg = {
      idColumn: { jsonKey: "payrollId", valueType: "integer" },
      columns: [
        {
          key: "payrollId",
          sqlName: "payroll_id",
          label: "ID",
          valueType: "integer",
        },
        {
          key: "guardId",
          sqlName: "guard_id",
          label: "Guard",
          valueType: "text",
        },
        {
          key: "allowance",
          sqlName: "allowance",
          label: "Allowance",
          valueType: "numeric",
        },
        {
          key: "roundedOffAmount",
          sqlName: "rounded_off_amount",
          label: "Rounded",
          valueType: "numeric",
        },
      ],
    } as unknown as AdminEntityDefinition
    const payload = linesToExtrasPayload(
      [
        {
          clientKey: "1",
          payrollId: 7,
          guardId: "5",
          allowance: "100",
          roundedOffAmount: "99",
        },
      ],
      payrollLikeCfg,
      ["guardId", "allowance"],
      "guardId",
      { extrasPayloadKeys: ["roundedOffAmount"] },
    )
    expect(payload).toEqual([
      {
        payrollId: 7,
        guardId: "5",
        allowance: "100",
        roundedOffAmount: "99",
      },
    ])
  })

  it("preserves structured extrasPayloadKeys values (nested arrays) when there is no column", () => {
    const payrollLikeCfgLocal = {
      idColumn: { jsonKey: "payrollId", valueType: "integer" },
      columns: [
        {
          key: "payrollId",
          sqlName: "payroll_id",
          label: "ID",
          valueType: "integer",
        },
        {
          key: "guardId",
          sqlName: "guard_id",
          label: "Guard",
          valueType: "text",
        },
        {
          key: "allowance",
          sqlName: "allowance",
          label: "Allowance",
          valueType: "numeric",
        },
      ],
    } as unknown as AdminEntityDefinition
    const nested = [
      { denominationId: "1", cashCount: "2", denominationRef: { denomination: "100" } },
    ]
    const payload = linesToExtrasPayload(
      [
        {
          clientKey: "1",
          payrollId: 7,
          guardId: "5",
          allowance: "100",
          payrollCashCounts: nested,
        },
      ],
      payrollLikeCfgLocal,
      ["guardId", "allowance"],
      "guardId",
      { extrasPayloadKeys: ["payrollCashCounts"] },
    )
    expect(payload).toEqual([
      {
        payrollId: 7,
        guardId: "5",
        allowance: "100",
        payrollCashCounts: nested,
      },
    ])
  })
})

describe("mergeRelatedInlineDetailHydrateLines", () => {
  it("returns normalized when there are no unsaved drafts", () => {
    const prev = [{ clientKey: "saved-1", lineId: 1, voucherNo: "A", amount: "1" }]
    const normalized = [
      { clientKey: "saved-1", lineId: 1, voucherNo: "A", amount: "2" },
      { clientKey: "saved-2", lineId: 2, voucherNo: "B", amount: "3" },
    ]
    const zeros = new Set<string>(["amount"])
    const out = mergeRelatedInlineDetailHydrateLines(
      prev,
      normalized,
      persistKey,
      zeros,
      undefined,
      undefined,
    )
    expect(out).toEqual(normalized)
  })

  it("sandwiches unsaved drafts between server rows and trailing drafts", () => {
    const prev = [
      { clientKey: "saved-1", lineId: 1, voucherNo: "A", amount: "1" },
      { clientKey: "u1", voucherNo: "NEW", amount: "0" },
    ]
    const normalized = [
      { clientKey: "saved-1", lineId: 1, voucherNo: "A", amount: "9" },
      { clientKey: "saved-2", lineId: 2, voucherNo: "B", amount: "3" },
      { clientKey: "trail", voucherNo: "", amount: "0" },
    ]
    const zeros = new Set<string>(["amount"])
    const out = mergeRelatedInlineDetailHydrateLines(
      prev,
      normalized,
      persistKey,
      zeros,
      undefined,
      undefined,
    )
    expect(out.map((l) => l.clientKey)).toEqual([
      "saved-1",
      "saved-2",
      "u1",
      "trail",
    ])
  })
})

describe("serializeLineRowForExtrasPayload", () => {
  it("coerces bigint primary keys to JSON-safe numbers (Drizzle bigint identity)", () => {
    const line = {
      clientKey: "saved-99",
      lineId: 99n,
      voucherNo: "V1",
      amount: "10",
    } as const
    const out = serializeLineRowForExtrasPayload(
      line as never,
      testChildCfg,
      editableKeys as unknown as readonly string[],
    )
    expect(out.lineId).toBe(99)
    expect(out.voucherNo).toBe("V1")
    expect(out.amount).toBe("10")
  })
})
