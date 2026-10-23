import { describe, expect, it } from "vitest"

import { collectAdminEntityListChildSumIssues } from "./admin-entity-list-child-sum-validation"
import type { AdminEntityDefinition } from "./admin-entity-types"

function fakeChild(): AdminEntityDefinition {
  return {
    adminPage: false as const,
    slug: "child-rows",
    schemaSqlName: "public.child_rows",
    apiBase: "/api/admin/child-rows",
    queryKey: ["admin", "child-rows"],
    nav: { label: "Child" },
    metadataTitle: "Child",
    idColumn: { jsonKey: "childRowId", valueType: "integer" },
    deleteLabelColumnKey: "childRowId",
    columns: [
      {
        key: "childRowId",
        sqlName: "child_row_id",
        label: "ID",
        valueType: "integer",
        list: true,
        create: false,
        patch: false,
        sortable: true,
      },
      {
        key: "parentId",
        sqlName: "parent_id",
        label: "Parent",
        valueType: "integer",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
      {
        key: "amount",
        sqlName: "amount",
        label: "Amount",
        valueType: "numeric",
        list: true,
        create: true,
        patch: true,
        sortable: true,
      },
    ],
    listOrderBy: [{ columnKey: "childRowId", direction: "asc" }],
    ui: {
      title: "Child",
      singular: "row",
      addCardTitle: "Add",
      listTitle: "All",
      loadErrorLabel: "Error",
      emptyLabel: "Empty",
    },
  } as const satisfies AdminEntityDefinition
}

function fakeParentWithSum(
  overrides?: Partial<AdminEntityDefinition["columns"][number]>,
): AdminEntityDefinition {
  const sumCol = {
    key: "relatedSum",
    sqlName: "related_sum",
    label: "Sum",
    valueType: "numeric" as const,
    list: true,
    create: false,
    patch: false,
    sortable: false,
    listVirtual: true,
    listChildSum: {
      childEntitySlug: "child-rows",
      childFkColumnKey: "parentId",
      sumColumnKey: "amount",
    },
    ...overrides,
  }
  return {
    adminPage: true as const,
    slug: "parents",
    schemaSqlName: "public.parents",
    apiBase: "/api/admin/parents",
    queryKey: ["admin", "parents"],
    nav: { label: "Parents" },
    metadataTitle: "Parents",
    idColumn: { jsonKey: "parentId", valueType: "integer" },
    deleteLabelColumnKey: "parentId",
    columns: [
      {
        key: "parentId",
        sqlName: "parent_id",
        label: "ID",
        valueType: "integer",
        list: true,
        create: false,
        patch: false,
        sortable: true,
      },
      sumCol as never,
    ],
    listOrderBy: [{ columnKey: "parentId", direction: "asc" }],
    ui: {
      title: "Parents",
      singular: "parent",
      addCardTitle: "Add",
      listTitle: "All",
      loadErrorLabel: "Error",
      emptyLabel: "Empty",
    },
  } as const satisfies AdminEntityDefinition
}

describe("collectAdminEntityListChildSumIssues", () => {
  it("accepts a well-formed listChildSum column", () => {
    const entities = {
      parents: fakeParentWithSum(),
      "child-rows": fakeChild(),
    }
    expect(collectAdminEntityListChildSumIssues(entities)).toEqual([])
  })

  it("rejects listChildSum without listVirtual", () => {
    const entities = {
      parents: fakeParentWithSum({ listVirtual: false }),
      "child-rows": fakeChild(),
    }
    expect(collectAdminEntityListChildSumIssues(entities)).toEqual([
      "parents.relatedSum: listChildSum expects listVirtual: true (no physical parent column)",
    ])
  })

  it("rejects sortable listChildSum", () => {
    const entities = {
      parents: fakeParentWithSum({ sortable: true }),
      "child-rows": fakeChild(),
    }
    expect(collectAdminEntityListChildSumIssues(entities)).toEqual([
      "parents.relatedSum: listChildSum columns must be sortable: false (not supported in ORDER BY)",
    ])
  })

  it("rejects listChildSum column used in listOrderBy", () => {
    const parent = fakeParentWithSum()
    const broken: AdminEntityDefinition = {
      ...parent,
      listOrderBy: [{ columnKey: "relatedSum", direction: "asc" }],
    }
    const entities = {
      parents: broken,
      "child-rows": fakeChild(),
    }
    expect(collectAdminEntityListChildSumIssues(entities)).toEqual([
      "parents.relatedSum: listChildSum column must not appear in listOrderBy",
    ])
  })

  it("rejects unknown child entity slug", () => {
    const p = fakeParentWithSum()
    const col = p.columns.find((c) => c.key === "relatedSum")!
    const brokenCol = {
      ...col,
      listChildSum: {
        ...col.listChildSum!,
        childEntitySlug: "missing-child",
      },
    }
    const broken: AdminEntityDefinition = {
      ...p,
      columns: p.columns.map((c) =>
        c.key === "relatedSum" ? (brokenCol as never) : c,
      ),
    }
    const entities = { parents: broken, "child-rows": fakeChild() }
    expect(collectAdminEntityListChildSumIssues(entities)).toEqual([
      'parents.relatedSum: listChildSum.childEntitySlug "missing-child" is not registered',
    ])
  })

  it("rejects missing child FK or sum column keys", () => {
    const p = fakeParentWithSum()
    const col = p.columns.find((c) => c.key === "relatedSum")!
    const badFk = {
      ...col,
      listChildSum: { ...col.listChildSum!, childFkColumnKey: "nope" },
    }
    const badSum = {
      ...col,
      listChildSum: { ...col.listChildSum!, sumColumnKey: "nope" },
    }
    expect(
      collectAdminEntityListChildSumIssues({
        parents: {
          ...p,
          columns: p.columns.map((c) =>
            c.key === "relatedSum" ? (badFk as never) : c,
          ),
        },
        "child-rows": fakeChild(),
      }),
    ).toEqual([
      'parents.relatedSum: listChildSum.childFkColumnKey "nope" missing on child-rows',
    ])
    expect(
      collectAdminEntityListChildSumIssues({
        parents: {
          ...p,
          columns: p.columns.map((c) =>
            c.key === "relatedSum" ? (badSum as never) : c,
          ),
        },
        "child-rows": fakeChild(),
      }),
    ).toEqual([
      'parents.relatedSum: listChildSum.sumColumnKey "nope" missing on child-rows',
    ])
  })

  it("rejects non-numeric sum column on child", () => {
    const child = fakeChild()
    const brokenChild: AdminEntityDefinition = {
      ...child,
      columns: child.columns.map((c) =>
        c.key === "amount"
          ? { ...c, valueType: "text" as const }
          : c,
      ),
    }
    const entities = {
      parents: fakeParentWithSum(),
      "child-rows": brokenChild,
    }
    expect(collectAdminEntityListChildSumIssues(entities)).toEqual([
      "parents.relatedSum: listChildSum.sumColumnKey must reference a numeric or integer column on child-rows",
    ])
  })

  it("accepts sumIntegerTimesPayrollAllowance listChildSum", () => {
    const payrollOvertimes: AdminEntityDefinition = {
      adminPage: false as const,
      slug: "payroll-overtimes",
      schemaSqlName: "ga.payroll_overtimes",
      apiBase: "/api/admin/payroll-overtimes",
      queryKey: ["admin", "payroll-overtimes"],
      nav: { label: "OT" },
      metadataTitle: "OT",
      idColumn: { jsonKey: "payrollOvertimeId", valueType: "integer" },
      deleteLabelColumnKey: "payrollOvertimeId",
      columns: [
        {
          key: "payrollOvertimeId",
          sqlName: "payroll_overtime_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "payrollId",
          sqlName: "payroll_id",
          label: "Payroll",
          valueType: "integer",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
        {
          key: "absentGuardId",
          sqlName: "absent_guard_id",
          label: "Absent",
          valueType: "integer",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
        {
          key: "days",
          sqlName: "days",
          label: "Days",
          valueType: "integer",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
      ],
      listOrderBy: [{ columnKey: "payrollOvertimeId", direction: "asc" }],
      ui: {
        title: "OT",
        singular: "line",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    const payrolls: AdminEntityDefinition = {
      adminPage: false as const,
      slug: "payrolls",
      schemaSqlName: "ga.payrolls",
      apiBase: "/api/admin/payrolls",
      queryKey: ["admin", "payrolls"],
      nav: { label: "Payrolls" },
      metadataTitle: "Payrolls",
      idColumn: { jsonKey: "payrollId", valueType: "integer" },
      deleteLabelColumnKey: "payrollId",
      columns: [
        {
          key: "payrollId",
          sqlName: "payroll_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "allowance",
          sqlName: "allowance",
          label: "Allowance",
          valueType: "numeric",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
      ],
      listOrderBy: [{ columnKey: "payrollId", direction: "asc" }],
      ui: {
        title: "Payrolls",
        singular: "payroll",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    const parent: AdminEntityDefinition = {
      adminPage: true as const,
      slug: "parents",
      schemaSqlName: "public.parents",
      apiBase: "/api/admin/parents",
      queryKey: ["admin", "parents"],
      nav: { label: "Parents" },
      metadataTitle: "Parents",
      idColumn: { jsonKey: "parentId", valueType: "integer" },
      deleteLabelColumnKey: "parentId",
      columns: [
        {
          key: "parentId",
          sqlName: "parent_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "otSum",
          sqlName: "ot_sum",
          label: "OT sum",
          valueType: "numeric",
          list: true,
          create: false,
          patch: false,
          sortable: false,
          listVirtual: true,
          listChildSum: {
            kind: "sumIntegerTimesPayrollAllowance",
            childEntitySlug: "payroll-overtimes",
            childFkColumnKey: "payrollId",
            childIntegerColumnKey: "days",
            allowancePayrollFkColumnKey: "absentGuardId",
          },
        },
      ],
      listOrderBy: [{ columnKey: "parentId", direction: "asc" }],
      ui: {
        title: "Parents",
        singular: "parent",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    expect(
      collectAdminEntityListChildSumIssues({
        parents: parent,
        "payroll-overtimes": payrollOvertimes,
        payrolls,
      }),
    ).toEqual([])
  })

  it("accepts sumIntegerTimesPayrollPeriodNumeric listChildSum", () => {
    const payrollOvertimes: AdminEntityDefinition = {
      adminPage: false as const,
      slug: "payroll-overtimes",
      schemaSqlName: "ga.payroll_overtimes",
      apiBase: "/api/admin/payroll-overtimes",
      queryKey: ["admin", "payroll-overtimes"],
      nav: { label: "OT" },
      metadataTitle: "OT",
      idColumn: { jsonKey: "payrollOvertimeId", valueType: "integer" },
      deleteLabelColumnKey: "payrollOvertimeId",
      columns: [
        {
          key: "payrollOvertimeId",
          sqlName: "payroll_overtime_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "payrollId",
          sqlName: "payroll_id",
          label: "Payroll",
          valueType: "integer",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
        {
          key: "days",
          sqlName: "days",
          label: "Days",
          valueType: "integer",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
      ],
      listOrderBy: [{ columnKey: "payrollOvertimeId", direction: "asc" }],
      ui: {
        title: "OT",
        singular: "line",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    const payrolls: AdminEntityDefinition = {
      adminPage: false as const,
      slug: "payrolls",
      schemaSqlName: "ga.payrolls",
      apiBase: "/api/admin/payrolls",
      queryKey: ["admin", "payrolls"],
      nav: { label: "Payrolls" },
      metadataTitle: "Payrolls",
      idColumn: { jsonKey: "payrollId", valueType: "integer" },
      deleteLabelColumnKey: "payrollId",
      columns: [
        {
          key: "payrollId",
          sqlName: "payroll_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "payrollPeriodId",
          sqlName: "payroll_period_id",
          label: "Period",
          valueType: "integer",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
      ],
      listOrderBy: [{ columnKey: "payrollId", direction: "asc" }],
      ui: {
        title: "Payrolls",
        singular: "payroll",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    const payrollPeriods: AdminEntityDefinition = {
      adminPage: true as const,
      slug: "payroll-periods",
      schemaSqlName: "ga.payroll_periods",
      apiBase: "/api/admin/payroll-periods",
      queryKey: ["admin", "payroll-periods"],
      nav: { label: "Periods" },
      metadataTitle: "Periods",
      idColumn: { jsonKey: "payrollPeriodId", valueType: "integer" },
      deleteLabelColumnKey: "payrollPeriodId",
      columns: [
        {
          key: "payrollPeriodId",
          sqlName: "payroll_period_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "perDayAllowance",
          sqlName: "per_day_allowance",
          label: "Per day",
          valueType: "numeric",
          list: true,
          create: true,
          patch: true,
          sortable: true,
        },
      ],
      listOrderBy: [{ columnKey: "payrollPeriodId", direction: "asc" }],
      ui: {
        title: "Periods",
        singular: "period",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    const parent: AdminEntityDefinition = {
      adminPage: true as const,
      slug: "parents",
      schemaSqlName: "public.parents",
      apiBase: "/api/admin/parents",
      queryKey: ["admin", "parents"],
      nav: { label: "Parents" },
      metadataTitle: "Parents",
      idColumn: { jsonKey: "parentId", valueType: "integer" },
      deleteLabelColumnKey: "parentId",
      columns: [
        {
          key: "parentId",
          sqlName: "parent_id",
          label: "ID",
          valueType: "integer",
          list: true,
          create: false,
          patch: false,
          sortable: true,
        },
        {
          key: "replacementSum",
          sqlName: "replacement_sum",
          label: "Replacement",
          valueType: "numeric",
          list: true,
          create: false,
          patch: false,
          sortable: false,
          listVirtual: true,
          listChildSum: {
            kind: "sumIntegerTimesPayrollPeriodNumeric",
            childEntitySlug: "payroll-overtimes",
            childFkColumnKey: "payrollId",
            childIntegerColumnKey: "days",
            periodNumericColumnKey: "perDayAllowance",
          },
        },
      ],
      listOrderBy: [{ columnKey: "parentId", direction: "asc" }],
      ui: {
        title: "Parents",
        singular: "parent",
        addCardTitle: "Add",
        listTitle: "All",
        loadErrorLabel: "Error",
        emptyLabel: "Empty",
      },
    } as const satisfies AdminEntityDefinition

    expect(
      collectAdminEntityListChildSumIssues({
        parents: parent,
        "payroll-overtimes": payrollOvertimes,
        payrolls,
        "payroll-periods": payrollPeriods,
      }),
    ).toEqual([])
  })

  it("rejects combining listChildSum with listRelation", () => {
    const p = fakeParentWithSum()
    const col = p.columns.find((c) => c.key === "relatedSum")!
    const brokenCol = {
      ...col,
      listRelation: {
        relatedEntitySlug: "child-rows",
        embedJsonKey: "childRef",
        labelColumnKeys: ["amount"] as const,
      },
    }
    const broken: AdminEntityDefinition = {
      ...p,
      columns: p.columns.map((c) =>
        c.key === "relatedSum" ? (brokenCol as never) : c,
      ),
    }
    expect(
      collectAdminEntityListChildSumIssues({
        parents: broken,
        "child-rows": fakeChild(),
      }),
    ).toEqual([
      "parents.relatedSum: listChildSum cannot combine with listRelation or listManyRelation",
    ])
  })
})
