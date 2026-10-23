"use client"

import { useMemo, useRef, type MutableRefObject } from "react"
import {
  EMPTY_FOOTER_SUM_KEYS,
  EMPTY_INLINE_READONLY_KEYS,
  EMPTY_INLINE_VIRTUAL_COLUMNS,
  adminEntityRelatedInlineTableOnCreate,
  defaultRelatedInlineTableColumnSpecs,
  orderRelatedInlineTableColumnSpecs,
  relatedVirtualFactors,
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityCrudRelatedEmbedPreviewColumn,
  AdminEntityCrudRelatedVirtualColumn,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"

export function relatedInlineColumnAlignClass(
  m: RelatedInlineCellColumnMeta | undefined,
): string {
  const a = m?.cellAlign ?? "left"
  if (a === "center") return "text-center"
  if (a === "right") return "text-right"
  return "text-left"
}

/**
 * Pure config derivations for RelatedCollectionInlineTable — memos and refs
 * computed from entity config and props with no state or side effects.
 */
export function useRelatedInlineTableConfig({
  childCfg,
  collection,
  detailPayload,
  entityRowId,
  variant,
  parentCrudForm,
}: {
  childCfg: AdminEntityDefinition | null | undefined
  collection: AdminEntityCrudRelatedCollectionTable
  detailPayload: Record<string, unknown> | undefined
  entityRowId: string | null
  variant: "create" | "edit"
  parentCrudForm?: AdminEntityCrudFormSubscribeApi
}) {
  /** Re-subscribe related memos when the parent PK field in the CRUD form changes. */
  const parentFkFormTickle = String(
    parentCrudForm?.getFieldValue(collection.parentFkColumnKey) ?? "",
  )

  const persistKey =
    collection.persistWhenColumnKeyNonEmpty ??
    collection.inlineEditableColumnKeys[0] ??
    "id"

  /** Numeric / plain integer cells default to "0" on new draft rows; those values still count as "empty" for persist-key–only drafts. */
  const zeroSentinelKeys = useMemo(() => {
    if (!childCfg) return new Set<string>()
    const s = new Set<string>()
    for (const k of collection.inlineEditableColumnKeys) {
      const col = childCfg.columns.find((c) => c.key === k)
      if (col?.valueType === "numeric") s.add(k)
      else if (col?.valueType === "integer" && !col.listRelation) s.add(k)
    }
    return s
  }, [childCfg, collection.inlineEditableColumnKeys])

  const footerSumColumnKeys =
    collection.footerSumColumnKeys ?? EMPTY_FOOTER_SUM_KEYS
  const hasFooterSums = footerSumColumnKeys.length > 0
  const inlineReadonlyColumnKeys =
    collection.inlineReadonlyColumnKeys ?? EMPTY_INLINE_READONLY_KEYS
  const inlineVirtualColumns =
    collection.inlineVirtualColumns ?? EMPTY_INLINE_VIRTUAL_COLUMNS
  const inlineRelationEmbedColumns =
    collection.inlineRelationEmbedColumns ?? []
  const inlinePinnedEndColumnKey = collection.inlinePinnedEndColumnKey
  const inlinePinnedStartColumnKey = collection.inlinePinnedStartColumnKey

  const virtualColumnByFooterKey = useMemo(() => {
    const m = new Map<string, AdminEntityCrudRelatedVirtualColumn>()
    for (const vc of inlineVirtualColumns) {
      m.set(vc.key, vc)
    }
    return m
  }, [inlineVirtualColumns])

  const embedColumnByFooterKey = useMemo(() => {
    const m = new Map<string, AdminEntityCrudRelatedEmbedPreviewColumn>()
    for (const ec of inlineRelationEmbedColumns) {
      m.set(ec.key, ec)
    }
    return m
  }, [inlineRelationEmbedColumns])

  const orderedInlineColumnSpecs = useMemo(
    () =>
      orderRelatedInlineTableColumnSpecs(
        defaultRelatedInlineTableColumnSpecs(
          collection.inlineEditableColumnKeys,
          inlineVirtualColumns,
          inlineReadonlyColumnKeys,
          inlineRelationEmbedColumns,
        ),
        collection.inlineTableColumnOrder,
      ),
    [
      collection.inlineEditableColumnKeys,
      collection.inlineTableColumnOrder,
      inlineReadonlyColumnKeys,
      inlineRelationEmbedColumns,
      inlineVirtualColumns,
    ],
  )

  /**
   * Parent FK and relation-numeric operands may be omitted from inline editable/readonly columns
   * but must stay on each LineRow for virtual cells.
   */
  const relatedLineHydrateKeys = useMemo(() => {
    const s = new Set<string>()
    s.add(collection.parentFkColumnKey)
    for (const f of relatedVirtualFactors(
      collection.inlineVirtualColumns ?? [],
    )) {
      if (f.kind === "relationNumeric") s.add(f.fkColumnKey)
    }
    const editable = new Set(collection.inlineEditableColumnKeys)
    const ro = new Set(inlineReadonlyColumnKeys)
    const base = [...s].filter((k) => !editable.has(k) && !ro.has(k))
    const extra = collection.inlineHydrateKeysFromServerRow ?? []
    const merged = [...base]
    for (const k of extra) {
      if (editable.has(k) || ro.has(k)) continue
      if (!merged.includes(k)) merged.push(k)
    }
    return merged
  }, [
    collection.parentFkColumnKey,
    collection.inlineEditableColumnKeys,
    collection.inlineHydrateKeysFromServerRow,
    collection.inlineVirtualColumns,
    inlineReadonlyColumnKeys,
  ])

  /** Preset implicit parent FK on draft rows when that column is not inline-editable. */
  const implicitLineFieldsFromParentFk = useMemo(():
    | Readonly<Record<string, string>>
    | undefined => {
    const pk = collection.parentFkColumnKey
    if (collection.inlineEditableColumnKeys.includes(pk)) return undefined
    const fromParentCol = collection.childFkValueFromParentColumnKey
    if (fromParentCol != null && fromParentCol !== "") {
      const raw = detailPayload?.[fromParentCol]
      const s = raw == null ? "" : String(raw).trim()
      if (s !== "") {
        return { [pk]: s }
      }
      return undefined
    }
    const rowId = entityRowId == null ? "" : String(entityRowId).trim()
    if (rowId !== "") {
      return { [pk]: rowId }
    }
    if (
      variant === "create" &&
      adminEntityRelatedInlineTableOnCreate(collection)
    ) {
      /** Use parentFkFormTickle (not parentCrudForm in deps): form instance identity can churn each render. */
      const v = parentFkFormTickle.trim()
      if (v === "") return undefined
      return { [pk]: v }
    }
    return undefined
  }, [
    collection.parentFkColumnKey,
    collection.childFkValueFromParentColumnKey,
    collection.inlineEditableColumnKeys,
    collection.inlineTableOnCreate,
    detailPayload,
    entityRowId,
    parentFkFormTickle,
    variant,
  ])

  const implicitLineFieldsFromParentFkRef: MutableRefObject<
    Readonly<Record<string, string>> | undefined
  > = useRef(implicitLineFieldsFromParentFk)
  implicitLineFieldsFromParentFkRef.current = implicitLineFieldsFromParentFk

  const implicitPersistIgnoreKeys = useMemo(
    () => new Set(Object.keys(implicitLineFieldsFromParentFk ?? {})),
    [implicitLineFieldsFromParentFk],
  )

  return {
    parentFkFormTickle,
    persistKey,
    zeroSentinelKeys,
    footerSumColumnKeys,
    hasFooterSums,
    inlineReadonlyColumnKeys,
    inlineVirtualColumns,
    inlineRelationEmbedColumns,
    inlinePinnedEndColumnKey,
    inlinePinnedStartColumnKey,
    virtualColumnByFooterKey,
    embedColumnByFooterKey,
    orderedInlineColumnSpecs,
    relatedLineHydrateKeys,
    implicitLineFieldsFromParentFk,
    implicitLineFieldsFromParentFkRef,
    implicitPersistIgnoreKeys,
  }
}
