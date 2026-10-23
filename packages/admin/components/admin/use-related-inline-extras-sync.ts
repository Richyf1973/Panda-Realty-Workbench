"use client"

import { useCallback, useEffect } from "react"

import {
  ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY,
  lineIsEmptyForPersist,
  linesToExtrasPayload,
  type AdminCrudInlineDraftIssuesMap,
  type LineRow,
} from "../../admin-entity-crud-related-collections-draft"
import type {
  AdminBuildExperimentalRelatedExtrasPayload,
  AdminClientRegistryValue,
} from "../../admin-client-registry-types"
import type { AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminEntityCrudRelatedCollectionTable } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"

interface UseRelatedInlineExtrasSyncOptions {
  childCfg: AdminEntityDefinition | undefined
  adminEntityCrudExtrasForSaveRef:
    | React.MutableRefObject<Record<string, unknown>>
    | undefined
  collection: AdminEntityCrudRelatedCollectionTable
  persistKey: string
  zeroSentinelKeys: ReadonlySet<string>
  implicitPersistIgnoreKeys: ReadonlySet<string>
  implicitLineFieldsFromParentFk: Readonly<Record<string, string>> | undefined
  relatedInlineDraftPreset: {
    presetEditableValues?: Readonly<Record<string, string>>
    lineEmptyOptions?: import("../../admin-entity-crud-related-collections-draft").LineIsEmptyForPersistOptions
  } | null
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  parentSlug: AdminEntitySlug
  variant: "create" | "edit"
  detailPayload: Record<string, unknown> | undefined
  persistWhenAnyEditableContent: boolean
  parentEntityCrudSparseItemsOnly: boolean
  buildExperimentalRelatedExtrasPayload:
    | AdminBuildExperimentalRelatedExtrasPayload
    | undefined
  frontendConfig: AdminClientRegistryValue["frontendConfig"]
  onExtrasPayloadSynced: (() => void) | undefined
  lines: LineRow[]
  linesFromAsyncPostProcessRef: React.MutableRefObject<boolean>
}

interface UseRelatedInlineExtrasSyncResult {
  applyRelatedInlineExtrasForSave: (linesForPayload: LineRow[]) => void
}

export function useRelatedInlineExtrasSync({
  childCfg,
  adminEntityCrudExtrasForSaveRef,
  collection,
  persistKey,
  zeroSentinelKeys,
  implicitPersistIgnoreKeys,
  implicitLineFieldsFromParentFk,
  relatedInlineDraftPreset,
  adminEntities,
  parentSlug,
  variant,
  detailPayload,
  persistWhenAnyEditableContent,
  parentEntityCrudSparseItemsOnly,
  buildExperimentalRelatedExtrasPayload,
  frontendConfig,
  onExtrasPayloadSynced,
  lines,
  linesFromAsyncPostProcessRef,
}: UseRelatedInlineExtrasSyncOptions): UseRelatedInlineExtrasSyncResult {
  const applyRelatedInlineExtrasForSave = useCallback(
    (linesForPayload: LineRow[]) => {
      if (!childCfg || !adminEntityCrudExtrasForSaveRef) return
      const refObj = adminEntityCrudExtrasForSaveRef.current
      const prevIssues = refObj[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY] as
        | AdminCrudInlineDraftIssuesMap
        | undefined
      const nextIssues: AdminCrudInlineDraftIssuesMap = { ...(prevIssues ?? {}) }
      const leo = relatedInlineDraftPreset?.lineEmptyOptions
      const hasOrphanDraftRow = linesForPayload.some(
        (l) =>
          String(l[persistKey] ?? "").trim() === "" &&
          !lineIsEmptyForPersist(
            l,
            persistKey,
            zeroSentinelKeys,
            implicitPersistIgnoreKeys,
            leo,
          ),
      )
      if (hasOrphanDraftRow) {
        nextIssues[collection.jsonKey] =
          "This section has a row with values but no primary selection (e.g. no item). Select one or delete the row."
      } else {
        delete nextIssues[collection.jsonKey]
      }
      if (Object.keys(nextIssues).length === 0) {
        delete refObj[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY]
      } else {
        refObj[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY] = nextIssues
      }

      const extrasPayloadOpts =
        collection.inlineExtrasPayloadKeys != null &&
        collection.inlineExtrasPayloadKeys.length > 0
          ? { extrasPayloadKeys: collection.inlineExtrasPayloadKeys }
          : undefined
      const treatEmpty =
        relatedInlineDraftPreset?.lineEmptyOptions?.newDraftTreatFieldValuesAsEmpty

      let assignedExtras = false
      if (
        frontendConfig.admin.experimentalSparseCrud === true &&
        variant === "edit" &&
        buildExperimentalRelatedExtrasPayload != null &&
        detailPayload != null &&
        Array.isArray(detailPayload[collection.jsonKey])
      ) {
        const sparseOut = buildExperimentalRelatedExtrasPayload({
          parentSlug,
          collectionJsonKey: collection.jsonKey,
          variant,
          lines: linesForPayload,
          detailPayloadItems: detailPayload[collection.jsonKey] as unknown[],
          childCfg,
          collection,
          persistKey,
          persistWhenAnyEditableContent:
            persistWhenAnyEditableContent === true,
          zeroSentinelKeys,
          implicitLineFields: implicitLineFieldsFromParentFk,
          extrasPayloadKeys: collection.inlineExtrasPayloadKeys,
          ...(treatEmpty != null
            ? { newDraftTreatFieldValuesAsEmpty: treatEmpty }
            : {}),
        })
        if (sparseOut === null) {
          delete refObj[collection.jsonKey]
          assignedExtras = true
        } else if (sparseOut !== undefined) {
          refObj[collection.jsonKey] = sparseOut
          assignedExtras = true
        }
      }

      if (!assignedExtras) {
        if (
          parentEntityCrudSparseItemsOnly &&
          variant === "edit" &&
          collection.jsonKey === "items"
        ) {
          delete refObj[collection.jsonKey]
        } else {
          refObj[collection.jsonKey] = linesToExtrasPayload(
            linesForPayload,
            childCfg,
            collection.inlineEditableColumnKeys,
            persistKey,
            persistWhenAnyEditableContent
              ? {
                  zeroSentinelKeys,
                  persistWhenAnyEditableContent: true,
                  implicitLineFields: implicitLineFieldsFromParentFk,
                  ...(treatEmpty != null
                    ? { newDraftTreatFieldValuesAsEmpty: treatEmpty }
                    : {}),
                  ...extrasPayloadOpts,
                }
              : extrasPayloadOpts,
          )
        }
      }
      if (!linesFromAsyncPostProcessRef.current) {
        onExtrasPayloadSynced?.()
      }
      linesFromAsyncPostProcessRef.current = false
    },
    [
      adminEntities,
      adminEntityCrudExtrasForSaveRef,
      buildExperimentalRelatedExtrasPayload,
      childCfg,
      collection.inlineEditableColumnKeys,
      collection.inlineExtrasPayloadKeys,
      collection.jsonKey,
      detailPayload,
      implicitLineFieldsFromParentFk,
      implicitPersistIgnoreKeys,
      onExtrasPayloadSynced,
      parentSlug,
      persistKey,
      persistWhenAnyEditableContent,
      parentEntityCrudSparseItemsOnly,
      relatedInlineDraftPreset,
      variant,
      zeroSentinelKeys,
      frontendConfig,
      linesFromAsyncPostProcessRef,
    ],
  )

  useEffect(() => {
    applyRelatedInlineExtrasForSave(lines)

    return () => {
      if (!adminEntityCrudExtrasForSaveRef) return
      const ro = adminEntityCrudExtrasForSaveRef.current
      const map = ro[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY] as
        | AdminCrudInlineDraftIssuesMap
        | undefined
      if (map == null || typeof map !== "object") return
      const cleaned: AdminCrudInlineDraftIssuesMap = { ...map }
      delete cleaned[collection.jsonKey]
      if (Object.keys(cleaned).length === 0) {
        delete ro[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY]
      } else {
        ro[ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY] = cleaned
      }
    }
  }, [lines, applyRelatedInlineExtrasForSave, adminEntityCrudExtrasForSaveRef, collection.jsonKey])

  return { applyRelatedInlineExtrasForSave }
}
