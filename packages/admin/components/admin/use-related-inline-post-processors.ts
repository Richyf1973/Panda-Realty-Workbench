"use client"

import { useEffect, useMemo } from "react"

import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import type { AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminEntityCrudRelatedCollectionTable } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import {
  relatedInlineRowMatchesEmbedPatch,
  scheduleRelatedInlineFocusRestoreAfterEmbed,
} from "../../admin-entity-crud-related-inline-helpers"

interface UseRelatedInlinePostProcessorsOptions {
  childCfg: AdminEntityDefinition | undefined
  collection: AdminEntityCrudRelatedCollectionTable
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  parentSlug: AdminEntitySlug
  lines: LineRow[]
  linesRefForEmbedHydrate: React.MutableRefObject<LineRow[]>
  linesFromAsyncPostProcessRef: React.MutableRefObject<boolean>
  forcedEmbedRefreshVersion: number
  lastForcedEmbedRefreshVersionRef: React.MutableRefObject<number>
  persistKey: string
  zeroSentinelKeys: ReadonlySet<string>
  implicitPersistIgnoreKeys: ReadonlySet<string>
  implicitLineFieldsFromParentFk: Readonly<Record<string, string>> | undefined
  detailPending: boolean
  parentCrudForm: AdminEntityCrudFormSubscribeApi | undefined
  variant: "create" | "edit"
  relatedDraftGeneration: number
  relatedCollectionLinesChangePostProcess:
    | Readonly<
        Record<
          string,
          (ctx: import("../../admin-client-registry-types").AdminRelatedCollectionLinesPostProcessContext) => LineRow[] | null
        >
      >
    | undefined
  relatedCollectionLinesAsyncPostProcess:
    | Readonly<
        Record<
          string,
          (
            ctx: import("../../admin-client-registry-types").AdminRelatedCollectionLinesPostProcessContext,
          ) => Promise<LineRow[] | null>
        >
      >
    | undefined
  setLines: React.Dispatch<React.SetStateAction<LineRow[]>>
}

export function useRelatedInlinePostProcessors({
  childCfg,
  collection,
  adminEntities,
  parentSlug,
  lines,
  linesRefForEmbedHydrate,
  linesFromAsyncPostProcessRef,
  forcedEmbedRefreshVersion,
  lastForcedEmbedRefreshVersionRef,
  persistKey,
  zeroSentinelKeys,
  implicitPersistIgnoreKeys,
  implicitLineFieldsFromParentFk,
  detailPending,
  parentCrudForm,
  variant,
  relatedDraftGeneration,
  relatedCollectionLinesChangePostProcess,
  relatedCollectionLinesAsyncPostProcess,
  setLines,
}: UseRelatedInlinePostProcessorsOptions): void {
  const relationDetailEmbedCopySpecs = useMemo(() => {
    const out: { fkKey: string; embedKey: string; apiBase: string }[] = []
    if (!childCfg) return out
    for (const k of collection.inlineEditableColumnKeys) {
      const c = childCfg.columns.find((x) => x.key === k)
      const embedKey = c?.listRelation?.crudInlineCopyDetailEmbedToLineKey
      if (!embedKey || !c?.listRelation) continue
      const relCfg = adminEntities[c.listRelation.relatedEntitySlug]
      if (!relCfg?.apiBase) continue
      out.push({ fkKey: k, embedKey, apiBase: relCfg.apiBase })
    }
    return out
  }, [adminEntities, childCfg, collection.inlineEditableColumnKeys])

  const linesRelationFkSignature = useMemo(() => {
    const keys = collection.inlineEditableColumnKeys
    return lines
      .map((l) =>
        keys
          .map((k) => {
            const col = childCfg?.columns.find((c) => c.key === k)
            if (!col?.listRelation) return ""
            return `${k}:${String(l[k] ?? "").trim()}`
          })
          .join("|"),
      )
      .join(";;")
  }, [childCfg, collection.inlineEditableColumnKeys, lines])

  useEffect(() => {
    if (relationDetailEmbedCopySpecs.length === 0 || !childCfg) return
    const isForced = forcedEmbedRefreshVersion !== lastForcedEmbedRefreshVersionRef.current
    lastForcedEmbedRefreshVersionRef.current = forcedEmbedRefreshVersion
    const linesNow = linesRefForEmbedHydrate.current
    let cancelled = false
    void (async () => {
      type Patch = Record<string, unknown>
      const perLine = new Map<string, Patch>()
      for (const line of linesNow) {
        for (const sp of relationDetailEmbedCopySpecs) {
          const fkCol = childCfg.columns.find((x) => x.key === sp.fkKey)
          const relSlug = fkCol?.listRelation?.relatedEntitySlug
          const relCfg = relSlug ? adminEntities[relSlug] : undefined
          const relIdKey = relCfg?.idColumn.jsonKey ?? ""
          const code = String(line[sp.fkKey] ?? "").trim()
          if (code === "") {
            if (line[sp.embedKey] != null) {
              const prev = perLine.get(line.clientKey) ?? {}
              perLine.set(line.clientKey, { ...prev, [sp.embedKey]: undefined })
            }
            continue
          }
          const emb = line[sp.embedKey]
          const embId =
            emb != null &&
            typeof emb === "object" &&
            !Array.isArray(emb) &&
            relIdKey !== ""
              ? String((emb as Record<string, unknown>)[relIdKey] ?? "").trim()
              : ""
          if (embId === code && !isForced) continue
          try {
            const res = await fetch(
              `${sp.apiBase}/${encodeURIComponent(code)}`,
              { cache: "no-store" },
            )
            if (!res.ok) continue
            const row = (await res.json()) as Record<string, unknown>
            if (cancelled) return
            const prev = perLine.get(line.clientKey) ?? {}
            perLine.set(line.clientKey, { ...prev, [sp.embedKey]: row })
          } catch {
            /* ignore */
          }
        }
      }
      if (cancelled || perLine.size === 0) return

      const patchedKeys = new Set(perLine.keys())
      const entityIdColumnKey = childCfg.idColumn.jsonKey
      let embedFocusRestore: import("../../admin-entity-crud-related-inline-helpers").RelatedInlineEmbedFocusRestoreHint | null = null
      const activeEl = document.activeElement
      if (activeEl instanceof HTMLElement && patchedKeys.size > 0) {
        const tr = activeEl.closest("tr[data-testid]")
        const rowTid =
          tr instanceof HTMLTableRowElement
            ? tr.getAttribute("data-testid")
            : null
        if (
          rowTid != null &&
          relatedInlineRowMatchesEmbedPatch(
            rowTid,
            patchedKeys,
            linesNow,
            entityIdColumnKey,
            parentSlug,
            collection.jsonKey,
          )
        ) {
          embedFocusRestore = {
            rowTestId: rowTid,
            ariaLabel: activeEl.getAttribute("aria-label"),
            dataTestId: activeEl.getAttribute("data-testid"),
          }
        }
      }

      setLines((prev) =>
        prev.map((l) => {
          const p = perLine.get(l.clientKey)
          if (!p) return l
          const next: LineRow = { ...l, ...p }
          for (const [k, v] of Object.entries(p)) {
            if (v === undefined) {
              delete (next as Record<string, unknown>)[k]
            }
          }
          return next
        }),
      )

      if (embedFocusRestore != null) {
        scheduleRelatedInlineFocusRestoreAfterEmbed(embedFocusRestore)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    adminEntities,
    childCfg,
    collection.jsonKey,
    forcedEmbedRefreshVersion,
    linesRelationFkSignature,
    parentSlug,
    relationDetailEmbedCopySpecs,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  const linesPostProcessKey = collection.registryLinesChangePostProcessKey
  const linesPostProcessFn =
    linesPostProcessKey != null
      ? relatedCollectionLinesChangePostProcess?.[linesPostProcessKey]
      : undefined

  useEffect(() => {
    if (linesPostProcessFn == null || !childCfg) return
    /** Run outside `setLines` so hooks may call `parentCrudForm.setFieldValue` without cross-tree updates during a state updater. */
    const next = linesPostProcessFn({
      lines,
      persistKey,
      zeroSentinelKeys,
      implicitPersistIgnoreKeys,
      childCfg,
      collection,
      implicitLineFieldsFromParentFk: implicitLineFieldsFromParentFk ?? {},
      detailPending,
      parentCrudForm,
      relatedInlineVariant: variant,
      relatedDraftGeneration,
    })
    if (next != null) {
      setLines(next)
    }
    /**
     * Omit **`relatedDraftGeneration`**: extras sync bumps that counter after `lines` updates; listing
     * it here re-ran this effect twice per keystroke with no extra work for payment-check totals.
     */
  }, [
    linesPostProcessFn,
    childCfg,
    persistKey,
    zeroSentinelKeys,
    implicitPersistIgnoreKeys,
    collection,
    implicitLineFieldsFromParentFk,
    detailPending,
    parentCrudForm,
    variant,
    lines,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  const linesAsyncPostProcessKey =
    collection.registryLinesAsyncChangePostProcessKey
  const linesAsyncPostProcessFn =
    linesAsyncPostProcessKey != null
      ? relatedCollectionLinesAsyncPostProcess?.[linesAsyncPostProcessKey]
      : undefined

  useEffect(() => {
    if (linesAsyncPostProcessFn == null || !childCfg) return
    const ac = new AbortController()
    let cancelled = false
    void (async () => {
      const next = await linesAsyncPostProcessFn({
        lines: linesRefForEmbedHydrate.current,
        persistKey,
        zeroSentinelKeys,
        implicitPersistIgnoreKeys,
        childCfg,
        collection,
        implicitLineFieldsFromParentFk: implicitLineFieldsFromParentFk ?? {},
        detailPending,
        parentCrudForm,
        relatedInlineVariant: variant,
        relatedDraftGeneration,
        abortSignal: ac.signal,
      })
      if (cancelled || next == null) return
      linesFromAsyncPostProcessRef.current = true
      setLines(next)
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
    /**
     * Omit **`lines`**: the async fn calls `setLines(next)` on success, which would update `lines`
     * and immediately re-trigger this effect — causing an infinite fetch loop. Read the latest
     * lines through `linesRefForEmbedHydrate` (always current) instead. `relatedDraftGeneration`
     * already bumps whenever the user edits a line, serving as the real change trigger.
     * `linesFromAsyncPostProcessRef` is set before `setLines` so the extras-sync effect can skip
     * `onExtrasPayloadSynced` for these updates (avoiding a `relatedDraftGeneration` re-bump).
     */
  }, [
    linesAsyncPostProcessFn,
    childCfg,
    persistKey,
    zeroSentinelKeys,
    implicitPersistIgnoreKeys,
    collection,
    implicitLineFieldsFromParentFk,
    detailPending,
    parentCrudForm,
    variant,
    relatedDraftGeneration,
  ]) // eslint-disable-line react-hooks/exhaustive-deps
}
