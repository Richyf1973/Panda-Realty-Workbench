import { adminEntityListColumnsInOrder } from "./admin-entity-list-column-order"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
  AdminEntityListMobileCardGroupLayout,
  AdminEntityListMobileCardSpec,
} from "./admin-entity-types"

const DEFAULT_MOBILE_CARD_COLUMN_COUNT = 6

export type AdminEntityListMobileCardField = {
  columnKey: string
  label: string
  /** From column `cellAlign` — aligns card value text consistently with list semantics. */
  cellAlign?: "left" | "center" | "right"
  /** From column `currencySymbol` — keeps symbol + amount on one line in mobile cards. */
  currencySymbol?: string
  /** From column `listMobileCardHideFieldLabel` — value only in the card body. */
  hideLabel?: boolean
  /** From column `listMobileCardOmitRowWhenEmpty` — hide row when value is null/undefined/blank. */
  omitRowWhenEmpty?: boolean
  /** From column `listMobileCardLabelStackedAbove` — label on its own row above the value. */
  labelStackedAbove?: boolean
}

export type AdminEntityListMobileCardQtyUnitLineResolved = {
  readonly qtyKey: string
  readonly unitKey: string
  readonly unitFromRelatedEmbed?: {
    readonly embedJsonKey: string
    readonly relatedFieldKey: string
  }
}

export type AdminEntityListMobileCardResolvedGroup = {
  heading?: string
  layout: AdminEntityListMobileCardGroupLayout
  fields: readonly AdminEntityListMobileCardField[]
  mobileQtyUnitLine?: AdminEntityListMobileCardQtyUnitLineResolved
  mobileLineTotalsToggleAmountKeys?: readonly string[]
  /** Resolved from {@link AdminEntityListMobileCardGroupSpec.mobileCollectionSummary}. */
  mobileCollectionSummary?: {
    crField: AdminEntityListMobileCardField
    dateField: AdminEntityListMobileCardField
    uncollectedText: string
  }
}

export type AdminEntityListMobileCardResolved = {
  fields: readonly AdminEntityListMobileCardField[]
  titleColumnKey: string
  /** When set, {@link EntityDataTableMobileCards} renders body as sections instead of one flat list. */
  groups?: readonly AdminEntityListMobileCardResolvedGroup[]
  /** From {@link AdminEntityListMobileCardSpec.hideTitleFieldLabel}. */
  hideTitleFieldLabel?: boolean
  /** From {@link AdminEntityListMobileCardSpec.titleRowOpensEditDialog}. */
  titleRowOpensEditDialog?: boolean
}

function fieldFromColumn(
  key: string,
  col: AdminEntityColumn,
): AdminEntityListMobileCardField {
  return {
    columnKey: key,
    label: col.label,
    cellAlign: col.cellAlign,
    currencySymbol:
      col.valueType === "numeric" && col.currencySymbol?.trim()
        ? col.currencySymbol.trim()
        : undefined,
    hideLabel: col.listMobileCardHideFieldLabel === true,
    omitRowWhenEmpty: col.listMobileCardOmitRowWhenEmpty === true,
    ...(col.listMobileCardLabelStackedAbove === true
      ? { labelStackedAbove: true as const }
      : {}),
  }
}

/**
 * Resolves {@link AdminEntityDefinition.listMobileCard} (or default first-six list columns)
 * for the mobile admin list card layout.
 */
export function adminEntityListMobileCardFields(
  cfg: AdminEntityDefinition,
): AdminEntityListMobileCardResolved {
  const ordered = adminEntityListColumnsInOrder(cfg)
  const spec = cfg.listMobileCard as AdminEntityListMobileCardSpec | undefined
  const byKey = new Map(ordered.map((c) => [c.key, c]))

  if (spec?.groups != null && spec.groups.length > 0) {
    const titleColumnKey = spec.titleColumnKey?.trim()
    if (!titleColumnKey) {
      throw new Error(
        `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.titleColumnKey is required when listMobileCard.groups is set`,
      )
    }
    if (!byKey.has(titleColumnKey)) {
      throw new Error(
        `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.titleColumnKey ${JSON.stringify(titleColumnKey)} is not a list column`,
      )
    }

    const seen = new Set<string>()
    const groups: AdminEntityListMobileCardResolvedGroup[] = []

    for (const g of spec.groups) {
      const columnKeys = g.columnKeys ?? []

      if (g.mobileCollectionSummary != null) {
        if (columnKeys.length > 0) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileCollectionSummary requires empty columnKeys`,
          )
        }
        const m = g.mobileCollectionSummary
        const crKey = m.crColumnKey.trim()
        const dateKey = m.dateColumnKey.trim()
        const uncollectedText = m.uncollectedText.trim()
        if (!crKey || !dateKey || !uncollectedText) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileCollectionSummary needs non-empty crColumnKey, dateColumnKey, and uncollectedText`,
          )
        }
        if (crKey === titleColumnKey || dateKey === titleColumnKey) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileCollectionSummary must not use titleColumnKey`,
          )
        }
        if (seen.has(crKey) || seen.has(dateKey)) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard duplicate columnKey in mobileCollectionSummary`,
          )
        }
        const crCol = byKey.get(crKey)
        const dateCol = byKey.get(dateKey)
        if (!crCol || !dateCol) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileCollectionSummary references unknown or non-list column`,
          )
        }
        seen.add(crKey)
        seen.add(dateKey)
        groups.push({
          heading: g.heading?.trim() || undefined,
          layout: "collectionSummary",
          fields: [],
          mobileCollectionSummary: {
            crField: fieldFromColumn(crKey, crCol),
            dateField: fieldFromColumn(dateKey, dateCol),
            uncollectedText,
          },
        })
        continue
      }

      if (columnKeys.length === 0) {
        throw new Error(
          `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard group has empty columnKeys (use mobileCollectionSummary for collection blocks)`,
        )
      }
      const layout: AdminEntityListMobileCardGroupLayout =
        g.layout === "grid2" ? "grid2" : "rows"
      let mobileQtyUnitLine: AdminEntityListMobileCardQtyUnitLineResolved | undefined
      let mobileLineTotalsToggleAmountKeys: readonly string[] | undefined

      if (g.mobileQtyUnitLine != null) {
        if (layout !== "rows") {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileQtyUnitLine requires layout "rows"`,
          )
        }
        const qtyKey = g.mobileQtyUnitLine.qtyColumnKey.trim()
        const unitKey = g.mobileQtyUnitLine.unitColumnKey.trim()
        if (!qtyKey || !unitKey) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileQtyUnitLine needs non-empty qtyColumnKey and unitColumnKey`,
          )
        }
        const embedSpec = g.mobileQtyUnitLine.unitFromRelatedEmbed
        let unitFromRelatedEmbed:
          | { readonly embedJsonKey: string; readonly relatedFieldKey: string }
          | undefined
        if (embedSpec != null) {
          const embedJsonKey = embedSpec.embedJsonKey.trim()
          const relatedFieldKey = embedSpec.relatedFieldKey.trim()
          if (!embedJsonKey || !relatedFieldKey) {
            throw new Error(
              `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileQtyUnitLine.unitFromRelatedEmbed needs non-empty embedJsonKey and relatedFieldKey`,
            )
          }
          unitFromRelatedEmbed = { embedJsonKey, relatedFieldKey }
        }
        for (const key of [qtyKey, unitKey]) {
          if (key === titleColumnKey) {
            throw new Error(
              `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileQtyUnitLine must not use titleColumnKey`,
            )
          }
          if (seen.has(key)) {
            throw new Error(
              `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard duplicate columnKey ${JSON.stringify(key)} (mobileQtyUnitLine vs groups)`,
            )
          }
          if (!byKey.has(key)) {
            throw new Error(
              `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileQtyUnitLine references unknown or non-list column ${JSON.stringify(key)}`,
            )
          }
          seen.add(key)
        }
        mobileQtyUnitLine = {
          qtyKey,
          unitKey,
          ...(unitFromRelatedEmbed != null ? { unitFromRelatedEmbed } : {}),
        }
      }

      const toggleKeys = g.mobileLineTotalsToggleForColumnKeys
      if (toggleKeys != null && toggleKeys.length > 0) {
        if (layout !== "rows") {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileLineTotalsToggleForColumnKeys requires layout "rows"`,
          )
        }
        if (mobileQtyUnitLine == null) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileLineTotalsToggleForColumnKeys requires mobileQtyUnitLine on the same group`,
          )
        }
        const colSet = new Set(columnKeys)
        for (const k of toggleKeys) {
          if (!colSet.has(k)) {
            throw new Error(
              `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.mobileLineTotalsToggleForColumnKeys includes ${JSON.stringify(k)} missing from that group’s columnKeys`,
            )
          }
        }
        mobileLineTotalsToggleAmountKeys = [...toggleKeys]
      }

      const groupFields: AdminEntityListMobileCardField[] = []
      for (const key of columnKeys) {
        if (key === titleColumnKey) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.groups includes titleColumnKey ${JSON.stringify(titleColumnKey)} — keep the title out of groups`,
          )
        }
        if (seen.has(key)) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard duplicate columnKey ${JSON.stringify(key)} across groups`,
          )
        }
        seen.add(key)
        const col = byKey.get(key)
        if (!col) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.groups references unknown or non-list column ${JSON.stringify(key)}`,
          )
        }
        groupFields.push(fieldFromColumn(key, col))
      }
      if (groupFields.length > 0) {
        groups.push({
          heading: g.heading?.trim() || undefined,
          layout,
          fields: groupFields,
          ...(mobileQtyUnitLine != null ? { mobileQtyUnitLine } : {}),
          ...(mobileLineTotalsToggleAmountKeys != null &&
          mobileLineTotalsToggleAmountKeys.length > 0
            ? { mobileLineTotalsToggleAmountKeys }
            : {}),
        })
      }
    }

    const titleCol = byKey.get(titleColumnKey)
    if (!titleCol) {
      throw new Error(
        `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.titleColumnKey not found`,
      )
    }
    const fields: AdminEntityListMobileCardField[] = [
      fieldFromColumn(titleColumnKey, titleCol),
      ...groups.flatMap((gr) =>
        gr.layout === "collectionSummary" && gr.mobileCollectionSummary != null
          ? [
              gr.mobileCollectionSummary.crField,
              gr.mobileCollectionSummary.dateField,
            ]
          : [...gr.fields],
      ),
    ]

    if (spec.columnKeys != null && spec.columnKeys.length > 0) {
      const fromSpec = new Set(spec.columnKeys)
      const fromResolved = new Set(fields.map((f) => f.columnKey))
      if (fromSpec.size !== fromResolved.size) {
        throw new Error(
          `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.columnKeys length does not match groups + title when both are set`,
        )
      }
      for (const k of fromSpec) {
        if (!fromResolved.has(k)) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.columnKeys contains ${JSON.stringify(k)} missing from groups + title`,
          )
        }
      }
    }

    return {
      fields,
      titleColumnKey,
      groups,
      hideTitleFieldLabel: spec.hideTitleFieldLabel === true,
      titleRowOpensEditDialog: spec.titleRowOpensEditDialog === true,
    }
  }

  if (spec?.columnKeys?.length) {
    const fields: AdminEntityListMobileCardField[] = spec.columnKeys.map(
      (key) => {
        const col = byKey.get(key)
        if (!col) {
          throw new Error(
            `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.columnKeys references unknown or non-list column ${JSON.stringify(key)}`,
          )
        }
        return fieldFromColumn(key, col)
      },
    )
    const titleColumnKey =
      spec.titleColumnKey ?? spec.columnKeys[0] ?? fields[0]!.columnKey
    if (!byKey.has(titleColumnKey)) {
      throw new Error(
        `[adminEntityListMobileCardFields] ${cfg.slug}: listMobileCard.titleColumnKey ${JSON.stringify(titleColumnKey)} is not a list column`,
      )
    }
    return {
      fields,
      titleColumnKey,
      hideTitleFieldLabel: spec.hideTitleFieldLabel === true,
      titleRowOpensEditDialog: spec.titleRowOpensEditDialog === true,
    }
  }

  const fields = ordered
    .slice(0, DEFAULT_MOBILE_CARD_COLUMN_COUNT)
    .map((c) => fieldFromColumn(c.key, c))
  const titleColumnKey = fields[0]?.columnKey ?? ""
  return {
    fields,
    titleColumnKey,
    titleRowOpensEditDialog: spec?.titleRowOpensEditDialog === true,
  }
}
