import { describe, expect, it } from "vitest"

import type { AdminEntityColumn } from "./admin-entity-types"
import {
  buildAdminEntityCreateBody,
  buildAdminEntityPatchBody,
  formatAdminEntityCrudPayloadIssuesSummary,
  listAdminEntityCreateBodyBlockingIssues,
  listAdminEntityPatchBodyBlockingIssues,
} from "./admin-entity-crud-form-values"

const textCol = (overrides: Partial<AdminEntityColumn>): AdminEntityColumn =>
  ({
    key: "x",
    sqlName: "x",
    label: "X",
    valueType: "text" as const,
    docSqlType: "citext",
    list: false,
    create: true,
    patch: true,
    sortable: false,
    ...overrides,
  }) as AdminEntityColumn

describe("listAdminEntityCreateBodyBlockingIssues", () => {
  it("collects every required empty scalar", () => {
    const cols: AdminEntityColumn[] = [
      textCol({ key: "a", sqlName: "a", label: "Alpha", optionalOnCreate: true }),
      textCol({ key: "b", sqlName: "b", label: "Beta" }),
      textCol({ key: "c", sqlName: "c", label: "Gamma" }),
    ]
    const issues = listAdminEntityCreateBodyBlockingIssues(cols, { a: "", b: "", c: "" })
    expect(issues.map((i) => i.key)).toEqual(["b", "c"])
  })

  it("reports invalid boolean when not optional on create", () => {
    const cols: AdminEntityColumn[] = [
      textCol({
        key: "flag",
        sqlName: "flag",
        label: "Flag",
        valueType: "boolean" as const,
        docSqlType: "boolean, not null, default false",
      }),
    ]
    const issues = listAdminEntityCreateBodyBlockingIssues(cols, { flag: "" })
    expect(issues).toHaveLength(1)
    expect(issues[0]!.reason).toBe("boolean_invalid")
  })
})

describe("listAdminEntityPatchBodyBlockingIssues", () => {
  it("flags empty non-clearing patch field", () => {
    const cols: AdminEntityColumn[] = [
      textCol({ key: "b", sqlName: "b", label: "Beta", patchEmptyClears: false }),
    ]
    const issues = listAdminEntityPatchBodyBlockingIssues(cols, { b: "" })
    expect(issues.map((i) => i.key)).toEqual(["b"])
  })
})

describe("create body vs blocking issues (same stringCols as buildAdminEntityCreateRequestPayload)", () => {
  it("agrees for mixed required / optional / boolean columns", () => {
    const createCols: AdminEntityColumn[] = [
      textCol({ key: "a", sqlName: "a", label: "Alpha", optionalOnCreate: true }),
      textCol({ key: "b", sqlName: "b", label: "Beta" }),
      textCol({
        key: "flag",
        sqlName: "flag",
        label: "Flag",
        valueType: "boolean" as const,
        docSqlType: "boolean, not null, default false",
      }),
      textCol({
        key: "ghost",
        sqlName: "ghost",
        label: "Ghost",
        listVirtual: true,
      }),
    ]
    const stringCols = createCols.filter((c) => !c.listVirtual && !c.crudFormVirtual)
    const cases: Record<string, string>[] = [
      { a: "", b: "ok", flag: "true" },
      { a: "x", b: "", flag: "true" },
      { a: "x", b: "ok", flag: "" },
      { a: "x", b: "ok", flag: "true" },
    ]
    for (const value of cases) {
      const issues = listAdminEntityCreateBodyBlockingIssues(createCols, value)
      const body = buildAdminEntityCreateBody(stringCols, value)
      expect(body === null).toBe(issues.length > 0)
    }
  })
})

describe("patch body vs blocking issues (same stringCols as buildAdminEntityPatchRequestPayload)", () => {
  it("agrees for patch columns with clearing behaviour", () => {
    const patchCols: AdminEntityColumn[] = [
      textCol({
        key: "b",
        sqlName: "b",
        label: "Beta",
        patch: true,
        patchEmptyClears: false,
      }),
      textCol({
        key: "c",
        sqlName: "c",
        label: "Gamma",
        patch: true,
        patchEmptyClears: true,
      }),
      textCol({
        key: "flag",
        sqlName: "flag",
        label: "Flag",
        patch: true,
        valueType: "boolean" as const,
        docSqlType: "boolean",
        patchEmptyClears: true,
      }),
    ]
    const stringCols = patchCols.filter((c) => c.patch && !c.listVirtual && !c.crudFormVirtual)
    const cases: Record<string, string>[] = [
      { b: "ok", c: "", flag: "false" },
      { b: "", c: "", flag: "false" },
      { b: "ok", c: "x", flag: "" },
      { b: "ok", c: "x", flag: "maybe" },
    ]
    for (const value of cases) {
      const issues = listAdminEntityPatchBodyBlockingIssues(patchCols, value)
      const patch = buildAdminEntityPatchBody(stringCols, value)
      expect(patch === null).toBe(issues.length > 0)
    }
  })
})

describe("formatAdminEntityCrudPayloadIssuesSummary", () => {
  it("formats single and multiple labels", () => {
    expect(
      formatAdminEntityCrudPayloadIssuesSummary([
        { key: "b", label: "Beta", reason: "empty" },
      ]),
    ).toMatch(/Beta/)

    const multi = formatAdminEntityCrudPayloadIssuesSummary([
      { key: "b", label: "Beta", reason: "empty" },
      { key: "c", label: "Gamma", reason: "empty" },
    ])
    expect(multi).toMatch(/Beta/)
    expect(multi).toMatch(/Gamma/)
  })
})
