import type { AdminEntityDefinition } from "./admin-entity-types"

/**
 * Static checks for list-only virtual column shapes (`listVirtualRelationLabel`,
 * `listVirtualVat12InclusiveSplit`, `listVirtualSubtractFromBase`,
 * `listVirtualDateExistsInTable`, `listVirtualRoundedDayDiffTimestamps`, `listDayCountBadgeBands`,
 * and exclusivity vs `listYearMonthPair` when active) across any
 * app registry.
 */
export function collectAdminEntityListVirtualColumnIssues(
  entities: Readonly<Record<string, AdminEntityDefinition>>,
): string[] {
  const bad: string[] = []
  const slugs = new Set(Object.keys(entities))

  for (const slug of Object.keys(entities)) {
    const cfg = entities[slug]!
    const listOrderKeys = new Set(cfg.listOrderBy.map((s) => s.columnKey))

    for (const col of cfg.columns) {
      const relLabel = col.listVirtualRelationLabel
      const vatSplit = col.listVirtualVat12InclusiveSplit
      const subtractSpec = col.listVirtualSubtractFromBase
      const productSpec = col.listVirtualProductOfTwo
      const dateExists = col.listVirtualDateExistsInTable
      const dayDiffTs = col.listVirtualRoundedDayDiffTimestamps
      const postdatedDays = col.listVirtualPostdatedDaysUntilMaturity
      const junctionNet = col.listVirtualJunctionLinkedNetMinusMainColumn
      const junctionNetSum = col.listVirtualJunctionLinkedNetSum
      const junctionScalarPick = col.listVirtualJunctionScalarPick
      const orderByRelated = col.listVirtualOrderByRelatedColumn
      const ymActive = !!(col.listYearMonthPair && col.listVirtual && col.list)

      if (relLabel && vatSplit) {
        bad.push(
          `${slug}.${col.key}: listVirtualRelationLabel and listVirtualVat12InclusiveSplit are mutually exclusive`,
        )
        continue
      }

      const nKinds =
        (relLabel ? 1 : 0) +
        (vatSplit ? 1 : 0) +
        (subtractSpec ? 1 : 0) +
        (productSpec ? 1 : 0) +
        (ymActive ? 1 : 0) +
        (dateExists ? 1 : 0) +
        (dayDiffTs ? 1 : 0) +
        (postdatedDays ? 1 : 0) +
        (junctionNet ? 1 : 0) +
        (junctionNetSum ? 1 : 0) +
        (junctionScalarPick ? 1 : 0) +
        (orderByRelated ? 1 : 0)
      if (nKinds > 1) {
        bad.push(
          `${slug}.${col.key}: at most one of listVirtualRelationLabel, listVirtualVat12InclusiveSplit, listYearMonthPair (with list + listVirtual), listVirtualSubtractFromBase, listVirtualProductOfTwo, listVirtualDateExistsInTable, listVirtualRoundedDayDiffTimestamps, listVirtualPostdatedDaysUntilMaturity, listVirtualJunctionLinkedNetMinusMainColumn, listVirtualJunctionLinkedNetSum, listVirtualJunctionScalarPick, listVirtualOrderByRelatedColumn`,
        )
        continue
      }

      if (relLabel) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel expects create: false and patch: false (list-only)`,
          )
        }
        if (relLabel.labelColumnKeys.length === 0) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel.labelColumnKeys must be non-empty`,
          )
        }
        const src = cfg.columns.find((c) => c.key === relLabel.sourceColumnKey)
        if (!src) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel.sourceColumnKey ${JSON.stringify(relLabel.sourceColumnKey)} not found`,
          )
        } else if (!src.listRelation) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel.sourceColumnKey must reference a column with listRelation`,
          )
        } else {
          const relSlug = src.listRelation.relatedEntitySlug
          if (!slugs.has(relSlug)) {
            bad.push(
              `${slug}.${col.key}: listVirtualRelationLabel source listRelation.relatedEntitySlug ${JSON.stringify(relSlug)} is not registered`,
            )
          } else {
            const relatedKeys = new Set(
              entities[relSlug]!.columns.map((c) => c.key),
            )
            for (const lk of relLabel.labelColumnKeys) {
              if (!relatedKeys.has(lk)) {
                bad.push(
                  `${slug}.${col.key}: listVirtualRelationLabel.labelColumnKeys includes ${JSON.stringify(lk)} missing on ${relSlug}`,
                )
              }
            }
          }
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel requires sortable: false (no physical ORDER BY column)`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualRelationLabel column must not appear in listOrderBy`,
          )
        }
        continue
      }

      if (orderByRelated) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualOrderByRelatedColumn requires listVirtual: true`,
          )
        }
        if (col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualOrderByRelatedColumn expects list: false (sort-only; not a list cell)`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualOrderByRelatedColumn expects create: false and patch: false`,
          )
        }
        if (!col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualOrderByRelatedColumn requires sortable: true`,
          )
        }
        if (!listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualOrderByRelatedColumn must appear in listOrderBy`,
          )
        }
        const src = cfg.columns.find((c) => c.key === orderByRelated.sourceColumnKey)
        if (!src) {
          bad.push(
            `${slug}.${col.key}: listVirtualOrderByRelatedColumn.sourceColumnKey ${JSON.stringify(orderByRelated.sourceColumnKey)} not found`,
          )
        } else {
          if (!src.listRelation) {
            bad.push(
              `${slug}.${col.key}: listVirtualOrderByRelatedColumn.sourceColumnKey must reference a column with listRelation`,
            )
          } else if (!src.list) {
            bad.push(
              `${slug}.${col.key}: listVirtualOrderByRelatedColumn.sourceColumnKey must have list: true so the related join is built`,
            )
          } else {
            const relSlug = src.listRelation.relatedEntitySlug
            if (!slugs.has(relSlug)) {
              bad.push(
                `${slug}.${col.key}: listVirtualOrderByRelatedColumn source listRelation.relatedEntitySlug ${JSON.stringify(relSlug)} is not registered`,
              )
            } else {
              const relatedKeys = new Set(entities[relSlug]!.columns.map((c) => c.key))
              if (!relatedKeys.has(orderByRelated.relatedColumnKey)) {
                bad.push(
                  `${slug}.${col.key}: listVirtualOrderByRelatedColumn.relatedColumnKey ${JSON.stringify(orderByRelated.relatedColumnKey)} missing on ${relSlug}`,
                )
              }
            }
          }
        }
        continue
      }

      if (vatSplit) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit expects create: false and patch: false (list-only)`,
          )
        }
        if (col.valueType !== "numeric") {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit expects valueType: "numeric"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit column must not appear in listOrderBy`,
          )
        }
        if (vatSplit.component !== "net" && vatSplit.component !== "vat") {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit.component must be "net" | "vat"`,
          )
        }
        const gross = cfg.columns.find((c) => c.key === vatSplit.grossColumnKey)
        if (!gross) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit.grossColumnKey ${JSON.stringify(vatSplit.grossColumnKey)} not found`,
          )
        } else {
          if (gross.listVirtual) {
            bad.push(
              `${slug}.${col.key}: listVirtualVat12InclusiveSplit.grossColumnKey must be a physical column (not listVirtual)`,
            )
          }
          if (gross.valueType !== "numeric" && gross.valueType !== "integer") {
            bad.push(
              `${slug}.${col.key}: listVirtualVat12InclusiveSplit.grossColumnKey must be numeric or integer`,
            )
          }
        }
        if (vatSplit.grossColumnKey === col.key) {
          bad.push(
            `${slug}.${col.key}: listVirtualVat12InclusiveSplit.grossColumnKey must differ from the virtual column key`,
          )
        }
      }

      if (subtractSpec) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase expects create: false and patch: false (list-only)`,
          )
        }
        if (col.valueType !== "numeric") {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase expects valueType: "numeric"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase column must not appear in listOrderBy`,
          )
        }
        const { baseColumnKey, subtractColumnKeys } = subtractSpec
        if (subtractColumnKeys.length === 0) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase.subtractColumnKeys must be non-empty`,
          )
        }
        const seen = new Set<string>()
        for (const sk of subtractColumnKeys) {
          if (seen.has(sk)) {
            bad.push(
              `${slug}.${col.key}: listVirtualSubtractFromBase.subtractColumnKeys must not duplicate ${JSON.stringify(sk)}`,
            )
          }
          seen.add(sk)
        }
        if (baseColumnKey === col.key) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase.baseColumnKey must differ from the virtual column key`,
          )
        }
        for (const sk of subtractColumnKeys) {
          if (sk === col.key) {
            bad.push(
              `${slug}.${col.key}: listVirtualSubtractFromBase.subtractColumnKeys must not include the virtual column key`,
            )
          }
        }
        if (subtractColumnKeys.includes(baseColumnKey)) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase.baseColumnKey must not appear in subtractColumnKeys`,
          )
        }
        const baseCol = cfg.columns.find((c) => c.key === baseColumnKey)
        if (!baseCol) {
          bad.push(
            `${slug}.${col.key}: listVirtualSubtractFromBase.baseColumnKey ${JSON.stringify(baseColumnKey)} not found`,
          )
        } else {
          if (baseCol.listVirtual) {
            bad.push(
              `${slug}.${col.key}: listVirtualSubtractFromBase.baseColumnKey must be a physical column (not listVirtual)`,
            )
          }
          if (
            baseCol.valueType !== "numeric" &&
            baseCol.valueType !== "integer"
          ) {
            bad.push(
              `${slug}.${col.key}: listVirtualSubtractFromBase.baseColumnKey must be numeric or integer`,
            )
          }
        }
        for (const sk of subtractColumnKeys) {
          const sc = cfg.columns.find((c) => c.key === sk)
          if (!sc) {
            bad.push(
              `${slug}.${col.key}: listVirtualSubtractFromBase subtract key ${JSON.stringify(sk)} not found`,
            )
          } else {
            if (sc.listVirtual) {
              bad.push(
                `${slug}.${col.key}: listVirtualSubtractFromBase subtract keys must reference physical columns (not listVirtual): ${JSON.stringify(sk)}`,
              )
            }
            if (sc.valueType !== "numeric" && sc.valueType !== "integer") {
              bad.push(
                `${slug}.${col.key}: listVirtualSubtractFromBase subtract keys must be numeric or integer: ${JSON.stringify(sk)}`,
              )
            }
          }
        }
      }

      if (productSpec) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualProductOfTwo requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualProductOfTwo expects list: true`,
          )
        }
        if (col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualProductOfTwo expects patch: false (computed, not writable)`,
          )
        }
        if (col.valueType !== "numeric") {
          bad.push(
            `${slug}.${col.key}: listVirtualProductOfTwo expects valueType: "numeric"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualProductOfTwo requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualProductOfTwo column must not appear in listOrderBy`,
          )
        }
        for (const factorKey of [productSpec.leftColumnKey, productSpec.rightColumnKey]) {
          if (factorKey === col.key) {
            bad.push(
              `${slug}.${col.key}: listVirtualProductOfTwo factor column must differ from the virtual column key`,
            )
          }
          const fc = cfg.columns.find((c) => c.key === factorKey)
          if (!fc) {
            bad.push(
              `${slug}.${col.key}: listVirtualProductOfTwo factor ${JSON.stringify(factorKey)} not found`,
            )
          } else {
            if (fc.valueType !== "numeric" && fc.valueType !== "integer") {
              bad.push(
                `${slug}.${col.key}: listVirtualProductOfTwo factor ${JSON.stringify(factorKey)} must be numeric or integer`,
              )
            }
          }
        }
      }

      if (dateExists) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable expects create: false and patch: false (list-only)`,
          )
        }
        if (col.valueType !== "boolean") {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable expects valueType: "boolean"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable column must not appear in listOrderBy`,
          )
        }
        const fqn = dateExists.existsTableFqn
        if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i.test(fqn)) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable.existsTableFqn must match schema.table (safe identifiers only)`,
          )
        }
        const dcol = dateExists.existsDateColumnName
        if (!/^[a-z_][a-z0-9_]*$/i.test(dcol)) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable.existsDateColumnName must be a single safe SQL identifier`,
          )
        }
        const mainD = cfg.columns.find((c) => c.key === dateExists.mainDateColumnKey)
        if (!mainD) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable.mainDateColumnKey ${JSON.stringify(dateExists.mainDateColumnKey)} not found`,
          )
        } else if (mainD.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualDateExistsInTable.mainDateColumnKey must be a physical column`,
          )
        }
      }

      if (dayDiffTs) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps expects create: false and patch: false (list-only)`,
          )
        }
        if (col.valueType !== "integer") {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps expects valueType: "integer"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps column must not appear in listOrderBy`,
          )
        }
        if (
          dayDiffTs.endTimestampColumnKey === dayDiffTs.startTimestampColumnKey
        ) {
          bad.push(
            `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps end and start column keys must differ`,
          )
        }
        for (const k of [
          dayDiffTs.endTimestampColumnKey,
          dayDiffTs.startTimestampColumnKey,
        ] as const) {
          const ref = cfg.columns.find((c) => c.key === k)
          if (!ref) {
            bad.push(
              `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps column key ${JSON.stringify(k)} not found`,
            )
          } else if (ref.listVirtual) {
            bad.push(
              `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps column key ${JSON.stringify(k)} must be a physical column`,
            )
          } else if (ref.valueType !== "timestamp") {
            bad.push(
              `${slug}.${col.key}: listVirtualRoundedDayDiffTimestamps column key ${JSON.stringify(k)} must be valueType: "timestamp"`,
            )
          }
        }
      }

      if (postdatedDays) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity expects create: false and patch: false (list-only)`,
          )
        }
        if (col.valueType !== "integer") {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity expects valueType: "integer"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity column must not appear in listOrderBy`,
          )
        }
        const fqn = postdatedDays.paymentsQualifiedName
        if (!/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i.test(fqn)) {
          bad.push(
            `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity.paymentsQualifiedName must match schema.table (safe identifiers only)`,
          )
        }
        for (const name of [
          postdatedDays.paymentsCollectionDateColumnName,
          postdatedDays.paymentsCrNumberColumnName,
        ] as const) {
          if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
            bad.push(
              `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity payment column name must be a single safe SQL identifier`,
            )
          }
        }
        for (const k of [
          postdatedDays.maturityDateColumnKey,
          postdatedDays.crNumberColumnKey,
        ] as const) {
          const ref = cfg.columns.find((c) => c.key === k)
          if (!ref) {
            bad.push(
              `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity column key ${JSON.stringify(k)} not found`,
            )
          } else if (ref.listVirtual) {
            bad.push(
              `${slug}.${col.key}: listVirtualPostdatedDaysUntilMaturity column key ${JSON.stringify(k)} must be a physical column`,
            )
          }
        }
      }

      if (junctionScalarPick) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick expects create: false and patch: false (list-only)`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick column must not appear in listOrderBy`,
          )
        }
        const jSlug = junctionScalarPick.junctionEntitySlug
        if (!slugs.has(jSlug)) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick.junctionEntitySlug ${JSON.stringify(jSlug)} is not registered`,
          )
        } else {
          const junctionCfg = entities[jSlug]!
          const jKeys = new Set(junctionCfg.columns.map((c) => c.key))
          if (!jKeys.has(junctionScalarPick.junctionParentFkColumnKey)) {
            bad.push(
              `${slug}.${col.key}: listVirtualJunctionScalarPick.junctionParentFkColumnKey ${JSON.stringify(junctionScalarPick.junctionParentFkColumnKey)} missing on ${jSlug}`,
            )
          }
        }
        const juncSel = junctionScalarPick.junctionSelectColumnKey
        const relSlug = junctionScalarPick.relatedEntitySlug
        const jRelFk = junctionScalarPick.junctionRelatedFkColumnKey
        const relPick = junctionScalarPick.relatedPickColumnKey
        const modeJunctionOnly =
          juncSel != null &&
          juncSel !== "" &&
          (relSlug == null || relSlug === "") &&
          (jRelFk == null || jRelFk === "") &&
          (relPick == null || relPick === "")
        const modeViaRelated =
          relSlug != null &&
          relSlug !== "" &&
          jRelFk != null &&
          jRelFk !== "" &&
          relPick != null &&
          relPick !== ""
        if (modeJunctionOnly === modeViaRelated) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionScalarPick must set exactly one of: (junctionSelectColumnKey only) or (relatedEntitySlug + junctionRelatedFkColumnKey + relatedPickColumnKey)`,
          )
        } else if (modeJunctionOnly) {
          if (!slugs.has(jSlug)) {
            /* already reported */
          } else {
            const junctionCfg = entities[jSlug]!
            const jKeys = new Set(junctionCfg.columns.map((c) => c.key))
            if (!jKeys.has(juncSel!)) {
              bad.push(
                `${slug}.${col.key}: listVirtualJunctionScalarPick.junctionSelectColumnKey ${JSON.stringify(juncSel)} missing on ${jSlug}`,
              )
            }
          }
        } else if (modeViaRelated) {
          const relSlugN = relSlug as string
          const jRelFkN = jRelFk as string
          const relPickN = relPick as string
          if (!slugs.has(relSlugN)) {
            bad.push(
              `${slug}.${col.key}: listVirtualJunctionScalarPick.relatedEntitySlug ${JSON.stringify(relSlugN)} is not registered`,
            )
          } else {
            const junctionCfg = entities[jSlug]!
            const jKeys = new Set(junctionCfg.columns.map((c) => c.key))
            if (!jKeys.has(jRelFkN)) {
              bad.push(
                `${slug}.${col.key}: listVirtualJunctionScalarPick.junctionRelatedFkColumnKey ${JSON.stringify(jRelFkN)} missing on ${jSlug}`,
              )
            }
            const relCfg = entities[relSlugN]!
            const relKeys = new Set(relCfg.columns.map((c) => c.key))
            if (!relKeys.has(relPickN)) {
              bad.push(
                `${slug}.${col.key}: listVirtualJunctionScalarPick.relatedPickColumnKey ${JSON.stringify(relPickN)} missing on ${relSlugN}`,
              )
            }
          }
        }
      }

      if (junctionNetSum) {
        if (!col.listVirtual) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum requires listVirtual: true`,
          )
        }
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum expects list: true`,
          )
        }
        if (col.create || col.patch) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum expects create: false and patch: false (list-only)`,
          )
        }
        if (col.valueType !== "numeric") {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum expects valueType: "numeric"`,
          )
        }
        if (col.sortable) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum requires sortable: false`,
          )
        }
        if (listOrderKeys.has(col.key)) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum column must not appear in listOrderBy`,
          )
        }
        const jSlug = junctionNetSum.junctionEntitySlug
        const relSlug = junctionNetSum.relatedEntitySlug
        if (!slugs.has(jSlug)) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum.junctionEntitySlug ${JSON.stringify(jSlug)} is not registered`,
          )
        }
        if (!slugs.has(relSlug)) {
          bad.push(
            `${slug}.${col.key}: listVirtualJunctionLinkedNetSum.relatedEntitySlug ${JSON.stringify(relSlug)} is not registered`,
          )
        }
        if (slugs.has(jSlug) && slugs.has(relSlug)) {
          const junctionCfg = entities[jSlug]!
          const jKeys = new Set(junctionCfg.columns.map((c) => c.key))
          for (const k of [
            junctionNetSum.junctionParentFkColumnKey,
            junctionNetSum.junctionRelatedFkColumnKey,
          ] as const) {
            if (!jKeys.has(k)) {
              bad.push(
                `${slug}.${col.key}: listVirtualJunctionLinkedNetSum junction key ${JSON.stringify(k)} missing on ${jSlug}`,
              )
            }
          }
          const relCfg = entities[relSlug]!
          const relKeys = new Set(relCfg.columns.map((c) => c.key))
          for (const k of [
            junctionNetSum.relatedPkColumnKey,
            junctionNetSum.grossColumnKey,
            junctionNetSum.discountColumnKey,
            junctionNetSum.returnsAllowedColumnKey,
            junctionNetSum.taxesColumnKey,
          ] as const) {
            if (!relKeys.has(k)) {
              bad.push(
                `${slug}.${col.key}: listVirtualJunctionLinkedNetSum related key ${JSON.stringify(k)} missing on ${relSlug}`,
              )
            }
          }
        }
      }

      const dayBadge = col.listDayCountBadgeBands
      if (dayBadge) {
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listDayCountBadgeBands expects list: true`,
          )
        }
        if (col.valueType !== "integer") {
          bad.push(
            `${slug}.${col.key}: listDayCountBadgeBands expects valueType: "integer"`,
          )
        }
        const g = dayBadge.greenThrough
        const o0 = dayBadge.orangeFrom
        const o1 = dayBadge.orangeThrough
        const r = dayBadge.redFrom
        if (!(g < o0)) {
          bad.push(
            `${slug}.${col.key}: listDayCountBadgeBands requires greenThrough < orangeFrom`,
          )
        }
        if (!(o0 <= o1)) {
          bad.push(
            `${slug}.${col.key}: listDayCountBadgeBands requires orangeFrom <= orangeThrough`,
          )
        }
        if (!(o1 < r)) {
          bad.push(
            `${slug}.${col.key}: listDayCountBadgeBands requires orangeThrough < redFrom`,
          )
        }
      }

      const intBadge = col.listIntegerBadgeBands
      if (intBadge) {
        if (!col.list) {
          bad.push(
            `${slug}.${col.key}: listIntegerBadgeBands expects list: true`,
          )
        }
        if (col.valueType !== "integer") {
          bad.push(
            `${slug}.${col.key}: listIntegerBadgeBands expects valueType: "integer"`,
          )
        }
        if (!(intBadge.orangeFrom < intBadge.greenFrom)) {
          bad.push(
            `${slug}.${col.key}: listIntegerBadgeBands requires orangeFrom < greenFrom`,
          )
        }
      }
    }
  }

  return bad
}
