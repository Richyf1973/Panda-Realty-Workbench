"use client"

import { useCallback, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import {
  emptyDraftLine,
  lineIsEmptyForPersist,
  normalizeTrailingDrafts,
  type LineIsEmptyForPersistOptions,
  type LineRow,
} from "../../admin-entity-crud-related-collections-draft"
import { adminEntityLinkedRowFromListApiItem } from "../../admin-entity-linked-row-from-list-item"
import { deleteChildEntityRowViaImmediateApi } from "../../related-collection-inline-immediate-delete-api"
import { formatUnknownErrorMessage } from "../../read-api-error"
import type {
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import type { AdminMultiSelectRelationOption } from "./admin-entity-crud-list-relation-multi-select-popover-control"

interface RelatedInlineDraftPack {
  presetEditableValues?: Readonly<Record<string, string>>
  lineEmptyOptions?: LineIsEmptyForPersistOptions
}

interface UseRelatedInlineLineMutationsParams {
  childCfg: AdminEntityDefinition | null | undefined
  persistKey: string
  zeroSentinelKeys: Set<string>
  collection: AdminEntityCrudRelatedCollectionTable
  implicitLineFieldsFromParentFk: Readonly<Record<string, string>> | undefined
  implicitPersistIgnoreKeys: Set<string>
  relatedInlineDraftPack: RelatedInlineDraftPack | null
  adminEntities: Record<string, AdminEntityDefinition>
  variant: "create" | "edit"
  refetchParentEntityDetail?: (() => Promise<void>) | undefined
  captureFocusBeforeUpdate: (clientKey: string) => void
  setLines: Dispatch<SetStateAction<LineRow[]>>
}

/**
 * Manages line row mutations (add, update, remove, delete, multi-select FK) and
 * the immediate-delete busy/error state for RelatedCollectionInlineTable.
 */
export function useRelatedInlineLineMutations({
  childCfg,
  persistKey,
  zeroSentinelKeys,
  collection,
  implicitLineFieldsFromParentFk,
  implicitPersistIgnoreKeys,
  relatedInlineDraftPack,
  adminEntities,
  variant,
  refetchParentEntityDetail,
  captureFocusBeforeUpdate,
  setLines,
}: UseRelatedInlineLineMutationsParams) {
  const implicitFkRef = useRef(implicitLineFieldsFromParentFk)
  implicitFkRef.current = implicitLineFieldsFromParentFk

  const draftPackRef = useRef(relatedInlineDraftPack)
  draftPackRef.current = relatedInlineDraftPack

  const [immediateDeleteBusyClientKey, setImmediateDeleteBusyClientKey] =
    useState<string | null>(null)
  const [immediateDeleteError, setImmediateDeleteError] = useState<string | null>(
    null,
  )

  const updateLine = useCallback(
    (clientKey: string, patch: Partial<LineRow>) => {
      captureFocusBeforeUpdate(clientKey)
      setLines((prev) => {
        if (!childCfg) return prev
        const next = prev.map((l) =>
          l.clientKey === clientKey ? { ...l, ...patch } : l,
        )
        const pack = draftPackRef.current
        return normalizeTrailingDrafts(
          next,
          persistKey,
          zeroSentinelKeys,
          childCfg,
          collection.inlineEditableColumnKeys,
          implicitFkRef.current,
          pack?.presetEditableValues,
          pack?.lineEmptyOptions,
        )
      })
    },
    [
      persistKey,
      zeroSentinelKeys,
      childCfg,
      collection.inlineEditableColumnKeys,
      captureFocusBeforeUpdate,
    ],
  )

  const addEmptyRow = useCallback(() => {
    setLines((prev) => {
      if (!childCfg) return prev
      const keys = collection.inlineEditableColumnKeys
      const pack = draftPackRef.current
      if (prev.length === 0) {
        return [
          emptyDraftLine(
            childCfg,
            keys,
            implicitFkRef.current,
            pack?.presetEditableValues,
          ),
        ]
      }
      const last = prev[prev.length - 1]!
      if (
        lineIsEmptyForPersist(
          last,
          persistKey,
          zeroSentinelKeys,
          implicitPersistIgnoreKeys,
          pack?.lineEmptyOptions,
        )
      ) {
        const head = prev.slice(0, -1)
        return normalizeTrailingDrafts(
          [
            ...head,
            emptyDraftLine(
              childCfg,
              keys,
              implicitFkRef.current,
              pack?.presetEditableValues,
            ),
            last,
          ],
          persistKey,
          zeroSentinelKeys,
          childCfg,
          keys,
          implicitFkRef.current,
          pack?.presetEditableValues,
          pack?.lineEmptyOptions,
        )
      }
      return normalizeTrailingDrafts(
        [
          ...prev,
          emptyDraftLine(
            childCfg,
            keys,
            implicitFkRef.current,
            pack?.presetEditableValues,
          ),
        ],
        persistKey,
        zeroSentinelKeys,
        childCfg,
        keys,
        implicitFkRef.current,
        pack?.presetEditableValues,
        pack?.lineEmptyOptions,
      )
    })
  }, [
    persistKey,
    zeroSentinelKeys,
    childCfg,
    collection.inlineEditableColumnKeys,
    implicitPersistIgnoreKeys,
  ])

  const removeLine = useCallback(
    (clientKey: string) => {
      setLines((prev) => {
        if (!childCfg) return prev
        const pack = draftPackRef.current
        return normalizeTrailingDrafts(
          prev.filter((l) => l.clientKey !== clientKey),
          persistKey,
          zeroSentinelKeys,
          childCfg,
          collection.inlineEditableColumnKeys,
          implicitFkRef.current,
          pack?.presetEditableValues,
          pack?.lineEmptyOptions,
        )
      })
    },
    [
      persistKey,
      zeroSentinelKeys,
      childCfg,
      collection.inlineEditableColumnKeys,
    ],
  )

  const performDeleteLine = useCallback(
    async (line: LineRow) => {
      const idColumnKey = childCfg?.idColumn.jsonKey ?? "id"
      const rawId = line[idColumnKey]
      const isSaved =
        typeof rawId === "number"
          ? Number.isFinite(rawId)
          : typeof rawId === "string" && /^\d+$/.test(String(rawId).trim())
      const useImmediate =
        collection.relatedInlineImmediateDeleteViaChildApi === true &&
        variant === "edit" &&
        childCfg?.apiBase != null &&
        childCfg.apiBase !== ""

      if (!useImmediate || !isSaved || !childCfg) {
        setImmediateDeleteError(null)
        removeLine(line.clientKey)
        return
      }

      const idStr =
        typeof rawId === "number" ? String(rawId) : String(rawId).trim()
      setImmediateDeleteError(null)
      setImmediateDeleteBusyClientKey(line.clientKey)
      try {
        await deleteChildEntityRowViaImmediateApi(childCfg.apiBase, idStr)
        removeLine(line.clientKey)
        await refetchParentEntityDetail?.()
      } catch (e) {
        setImmediateDeleteError(formatUnknownErrorMessage(e))
      } finally {
        setImmediateDeleteBusyClientKey(null)
      }
    },
    [
      childCfg,
      collection.relatedInlineImmediateDeleteViaChildApi,
      variant,
      removeLine,
      refetchParentEntityDetail,
    ],
  )

  const applyMultiSelectFkLines = useCallback(
    (
      lineClientKey: string,
      fkKey: string,
      embedKey: string,
      relSlug: string,
      picked: readonly AdminMultiSelectRelationOption[],
    ) => {
      if (!childCfg || picked.length === 0) return
      const relCfgInner = adminEntities[relSlug]
      if (!relCfgInner) return

      const normalizeId = (s: string) => s.trim().toLowerCase()

      setLines((prev) => {
        const used = new Set<string>()
        for (const l of prev) {
          const v = normalizeId(String(l[fkKey] ?? ""))
          if (v) used.add(v)
        }

        const fresh = picked.filter((p) => !used.has(normalizeId(p.value)))
        if (fresh.length === 0) return prev

        const ix = prev.findIndex((l) => l.clientKey === lineClientKey)
        if (ix < 0) return prev

        const current = prev[ix]!
        const currentFk = String(current[fkKey] ?? "").trim()
        const currentEmpty = currentFk === ""

        const linked = (r: Record<string, unknown>) =>
          adminEntityLinkedRowFromListApiItem(r, relCfgInner)

        const next = [...prev]
        const newRows: LineRow[] = []

        if (currentEmpty) {
          const [first, ...rest] = fresh
          next[ix] = {
            ...current,
            [fkKey]: first.value,
            [embedKey]: linked(first.row),
          }
          for (const p of rest) {
            const line = emptyDraftLine(
              childCfg,
              collection.inlineEditableColumnKeys,
              implicitFkRef.current,
              draftPackRef.current?.presetEditableValues,
            )
            newRows.push({
              ...line,
              [fkKey]: p.value,
              [embedKey]: linked(p.row),
            })
          }
        } else {
          for (const p of fresh) {
            const line = emptyDraftLine(
              childCfg,
              collection.inlineEditableColumnKeys,
              implicitFkRef.current,
              draftPackRef.current?.presetEditableValues,
            )
            newRows.push({
              ...line,
              [fkKey]: p.value,
              [embedKey]: linked(p.row),
            })
          }
        }

        const merged = [...next, ...newRows]
        const pack = draftPackRef.current
        return normalizeTrailingDrafts(
          merged,
          persistKey,
          zeroSentinelKeys,
          childCfg,
          collection.inlineEditableColumnKeys,
          implicitFkRef.current,
          pack?.presetEditableValues,
          pack?.lineEmptyOptions,
        )
      })
    },
    [
      adminEntities,
      childCfg,
      collection.inlineEditableColumnKeys,
      persistKey,
      zeroSentinelKeys,
    ],
  )

  return {
    updateLine,
    addEmptyRow,
    performDeleteLine,
    applyMultiSelectFkLines,
    immediateDeleteBusyClientKey,
    immediateDeleteError,
  }
}
