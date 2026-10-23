import type { AdminEntityDefinition } from "./admin-entity-types"
import {
  adminEntityListChildSumIsIntegerTimesPayrollAllowance,
  adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric,
  adminEntityListChildSumIsProductOfTwoColumns,
  adminEntityListChildSumIsWithJoinFilter,
} from "./admin-entity-types"

/**
 * Static checks for `columns[].listChildSum` metadata (any app registry).
 */
export function collectAdminEntityListChildSumIssues(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): string[] {
  const bad: string[] = []
  const slugs = new Set(Object.keys(entities))

  for (const slug of Object.keys(entities)) {
    const cfg = entities[slug]!
    const listOrderKeys = new Set(cfg.listOrderBy.map((s) => s.columnKey))

    for (const col of cfg.columns) {
      const spec = col.listChildSum
      if (!spec) continue

      if (col.listRelation != null || col.listManyRelation != null) {
        bad.push(
          `${slug}.${col.key}: listChildSum cannot combine with listRelation or listManyRelation`,
        )
      }
      if (!col.listVirtual) {
        bad.push(
          `${slug}.${col.key}: listChildSum expects listVirtual: true (no physical parent column)`,
        )
      }
      if (col.sortable) {
        bad.push(
          `${slug}.${col.key}: listChildSum columns must be sortable: false (not supported in ORDER BY)`,
        )
      }
      if (listOrderKeys.has(col.key)) {
        bad.push(
          `${slug}.${col.key}: listChildSum column must not appear in listOrderBy`,
        )
      }
      if (!slugs.has(spec.childEntitySlug)) {
        bad.push(
          `${slug}.${col.key}: listChildSum.childEntitySlug ${JSON.stringify(spec.childEntitySlug)} is not registered`,
        )
        continue
      }

      const child = entities[spec.childEntitySlug]!
      const childColKeys = new Set(child.columns.map((c) => c.key))
      if (!childColKeys.has(spec.childFkColumnKey)) {
        bad.push(
          `${slug}.${col.key}: listChildSum.childFkColumnKey ${JSON.stringify(spec.childFkColumnKey)} missing on ${spec.childEntitySlug}`,
        )
      }

      if (adminEntityListChildSumIsIntegerTimesPayrollAllowance(spec)) {
        if (!slugs.has("payrolls")) {
          bad.push(
            `${slug}.${col.key}: listChildSum kind sumIntegerTimesPayrollAllowance requires a registered "payrolls" entity`,
          )
          continue
        }
        const payrollsEntity = entities["payrolls"]!
        const multSource =
          spec.allowanceMultSource ?? "payrollAllowance"
        if (multSource === "coveringPayrollGuardAllowance") {
          if (!slugs.has("guards")) {
            bad.push(
              `${slug}.${col.key}: listChildSum allowanceMultSource coveringPayrollGuardAllowance requires a registered "guards" entity`,
            )
          } else {
            const guardsEntity = entities["guards"]!
            const guardAllowance = guardsEntity.columns.find(
              (c) => c.key === "allowance",
            )
            if (!guardAllowance || guardAllowance.valueType !== "numeric") {
              bad.push(
                `${slug}.${col.key}: listChildSum coveringPayrollGuardAllowance requires guards.allowance (numeric)`,
              )
            }
          }
          const payrollGuardId = payrollsEntity.columns.find(
            (c) => c.key === "guardId",
          )
          if (!payrollGuardId || payrollGuardId.valueType !== "integer") {
            bad.push(
              `${slug}.${col.key}: listChildSum coveringPayrollGuardAllowance requires payrolls.guardId (integer)`,
            )
          }
        } else {
          const payrollAllowance = payrollsEntity.columns.find(
            (c) => c.key === "allowance",
          )
          if (!payrollAllowance || payrollAllowance.valueType !== "numeric") {
            bad.push(
              `${slug}.${col.key}: listChildSum kind sumIntegerTimesPayrollAllowance requires payrolls.allowance (numeric)`,
            )
          }
        }
        if (!childColKeys.has(spec.childIntegerColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.childIntegerColumnKey ${JSON.stringify(spec.childIntegerColumnKey)} missing on ${spec.childEntitySlug}`,
          )
        } else {
          const intCol = child.columns.find(
            (c) => c.key === spec.childIntegerColumnKey,
          )
          if (intCol && intCol.valueType !== "integer") {
            bad.push(
              `${slug}.${col.key}: listChildSum.childIntegerColumnKey must reference an integer column on ${spec.childEntitySlug}`,
            )
          }
        }
        if (!childColKeys.has(spec.allowancePayrollFkColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.allowancePayrollFkColumnKey ${JSON.stringify(spec.allowancePayrollFkColumnKey)} missing on ${spec.childEntitySlug}`,
          )
        }
        if (spec.divideAllowanceByPayrollPeriodDays === true) {
          if (!slugs.has("payroll-periods")) {
            bad.push(
              `${slug}.${col.key}: listChildSum divideAllowanceByPayrollPeriodDays requires a registered "payroll-periods" entity`,
            )
          } else {
            const ppEnt = entities["payroll-periods"]!
            const ppDays = ppEnt.columns.find((c) => c.key === "days")
            if (!ppDays || ppDays.valueType !== "integer") {
              bad.push(
                `${slug}.${col.key}: listChildSum divideAllowanceByPayrollPeriodDays requires payroll-periods.days (integer)`,
              )
            }
          }
          const payrollPeriodIdCol = payrollsEntity.columns.find(
            (c) => c.key === "payrollPeriodId",
          )
          if (!payrollPeriodIdCol || payrollPeriodIdCol.valueType !== "integer") {
            bad.push(
              `${slug}.${col.key}: listChildSum divideAllowanceByPayrollPeriodDays requires payrolls.payrollPeriodId (integer)`,
            )
          }
        }
      } else if (adminEntityListChildSumIsIntegerTimesPayrollPeriodNumeric(spec)) {
        if (!slugs.has("payrolls")) {
          bad.push(
            `${slug}.${col.key}: listChildSum kind sumIntegerTimesPayrollPeriodNumeric requires a registered "payrolls" entity`,
          )
        } else {
          const payrollsEntity = entities["payrolls"]!
          const payrollPeriodIdCol = payrollsEntity.columns.find(
            (c) => c.key === "payrollPeriodId",
          )
          if (!payrollPeriodIdCol || payrollPeriodIdCol.valueType !== "integer") {
            bad.push(
              `${slug}.${col.key}: listChildSum sumIntegerTimesPayrollPeriodNumeric requires payrolls.payrollPeriodId (integer)`,
            )
          }
        }
        if (!slugs.has("payroll-periods")) {
          bad.push(
            `${slug}.${col.key}: listChildSum sumIntegerTimesPayrollPeriodNumeric requires a registered "payroll-periods" entity`,
          )
        } else {
          const ppEnt = entities["payroll-periods"]!
          const periodNum = ppEnt.columns.find(
            (c) => c.key === spec.periodNumericColumnKey,
          )
          if (!periodNum) {
            bad.push(
              `${slug}.${col.key}: listChildSum.periodNumericColumnKey ${JSON.stringify(spec.periodNumericColumnKey)} missing on payroll-periods`,
            )
          } else if (
            periodNum.valueType !== "numeric" &&
            periodNum.valueType !== "integer"
          ) {
            bad.push(
              `${slug}.${col.key}: listChildSum.periodNumericColumnKey must reference a numeric or integer column on payroll-periods`,
            )
          }
        }
        if (!childColKeys.has(spec.childIntegerColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.childIntegerColumnKey ${JSON.stringify(spec.childIntegerColumnKey)} missing on ${spec.childEntitySlug}`,
          )
        } else {
          const intCol = child.columns.find(
            (c) => c.key === spec.childIntegerColumnKey,
          )
          if (intCol && intCol.valueType !== "integer") {
            bad.push(
              `${slug}.${col.key}: listChildSum.childIntegerColumnKey must reference an integer column on ${spec.childEntitySlug}`,
            )
          }
        }
      } else if (adminEntityListChildSumIsProductOfTwoColumns(spec)) {
        for (const colKey of [spec.leftColumnKey, spec.rightColumnKey]) {
          if (!childColKeys.has(colKey)) {
            bad.push(
              `${slug}.${col.key}: listChildSum sumProductOfTwoColumns column ${JSON.stringify(colKey)} missing on ${spec.childEntitySlug}`,
            )
          } else {
            const c = child.columns.find((cc) => cc.key === colKey)
            if (c && c.valueType !== "numeric" && c.valueType !== "integer") {
              bad.push(
                `${slug}.${col.key}: listChildSum sumProductOfTwoColumns column ${JSON.stringify(colKey)} must be numeric or integer on ${spec.childEntitySlug}`,
              )
            }
          }
        }
      } else if (adminEntityListChildSumIsWithJoinFilter(spec)) {
        if (!childColKeys.has(spec.sumColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.sumColumnKey ${JSON.stringify(spec.sumColumnKey)} missing on ${spec.childEntitySlug}`,
          )
        } else {
          const sumCol = child.columns.find((c) => c.key === spec.sumColumnKey)
          if (
            sumCol &&
            sumCol.valueType !== "numeric" &&
            sumCol.valueType !== "integer"
          ) {
            bad.push(
              `${slug}.${col.key}: listChildSum.sumColumnKey must reference a numeric or integer column on ${spec.childEntitySlug}`,
            )
          }
        }
        if (!childColKeys.has(spec.childJoinFkColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.childJoinFkColumnKey ${JSON.stringify(spec.childJoinFkColumnKey)} missing on ${spec.childEntitySlug}`,
          )
        }
        if (!slugs.has(spec.joinEntitySlug)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.joinEntitySlug ${JSON.stringify(spec.joinEntitySlug)} is not registered`,
          )
        } else {
          const joinEntity = entities[spec.joinEntitySlug]!
          const joinColKeys = new Set(joinEntity.columns.map((c) => c.key))
          if (!joinColKeys.has(spec.joinPkColumnKey)) {
            bad.push(
              `${slug}.${col.key}: listChildSum.joinPkColumnKey ${JSON.stringify(spec.joinPkColumnKey)} missing on ${spec.joinEntitySlug}`,
            )
          }
          if (!joinColKeys.has(spec.joinFilterColumnKey)) {
            bad.push(
              `${slug}.${col.key}: listChildSum.joinFilterColumnKey ${JSON.stringify(spec.joinFilterColumnKey)} missing on ${spec.joinEntitySlug}`,
            )
          }
        }
      } else {
        if (!childColKeys.has(spec.sumColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listChildSum.sumColumnKey ${JSON.stringify(spec.sumColumnKey)} missing on ${spec.childEntitySlug}`,
          )
        } else {
          const sumCol = child.columns.find((c) => c.key === spec.sumColumnKey)
          if (
            sumCol &&
            sumCol.valueType !== "numeric" &&
            sumCol.valueType !== "integer"
          ) {
            bad.push(
              `${slug}.${col.key}: listChildSum.sumColumnKey must reference a numeric or integer column on ${spec.childEntitySlug}`,
            )
          }
        }
      }
    }
  }

  return bad
}
