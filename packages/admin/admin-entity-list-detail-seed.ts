import {
  isAdminEntityCrudRelatedCollectionTable,
  type AdminEntityDefinition,
} from "./admin-entity-types"

/** List embed may ship **`paymentChecks`** placeholder rows (amounts only, no **maturity**) — not safe to skip GET detail. */
function paymentChecksEmbedRowsLackPersistableMaturity(
  rows: readonly unknown[],
): boolean {
  if (rows.length === 0) return false
  for (const row of rows) {
    if (row == null || typeof row !== "object") continue
    if (String((row as Record<string, unknown>).maturity ?? "").trim() !== "")
      return false
  }
  return true
}

/**
 * When list rows include the same nested arrays as GET detail (`crudRelatedCollections` jsonKeys),
 * returns a payload suitable for seeding the edit dialog’s detail query so it does not refetch.
 *
 * Includes **all fields from `row`** (e.g. `payrollPeriodId` for scoped FK option lists) while
 * still requiring each related collection array to be present — otherwise callers must refetch detail.
 */
export function adminEntityListDetailSeedFromRow(
  cfg: AdminEntityDefinition,
  row: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const rel = cfg.crudRelatedCollections
  if (!rel?.length) return undefined
  const out: Record<string, unknown> = { ...row }
  for (const c of rel) {
    if (!isAdminEntityCrudRelatedCollectionTable(c)) continue
    const v = row[c.jsonKey]
    if (!Array.isArray(v)) return undefined
    /**
     * **Payments** list rows often embed **Sales (DRs)** but omit or stub **Checks** as `[]`.
     * Treating that as a “trusted” seed skips the detail GET, so rollups never see real check lines
     * or a hydrated header — refetch whenever any table collection is still empty on the list row.
     */
    if (cfg.slug === "payments" && v.length === 0) return undefined
    /**
     * Non-empty **`paymentChecks`** without any **maturity** still isn’t detail-equivalent — the inline
     * footer / header sync treat those as non-persisted and sum **0**, clobbering **totalChecks**.
     */
    if (
      cfg.slug === "payments" &&
      c.jsonKey === "paymentChecks" &&
      paymentChecksEmbedRowsLackPersistableMaturity(v)
    ) {
      return undefined
    }
    out[c.jsonKey] = v
  }
  return out
}
