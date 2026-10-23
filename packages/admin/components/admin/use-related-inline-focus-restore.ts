"use client"

import { useLayoutEffect, useRef } from "react"

import {
  escapeDataTestIdForAttributeSelector,
  relatedInlineRowDataTestId,
} from "../../admin-entity-crud-related-inline-helpers"
import {
  isRelatedInlineRecentKeydownTarget,
  markAdminRelatedInlineProgrammaticFocus,
} from "../../admin-related-inline-programmatic-focus"
import { RELATED_INLINE_NAV_TARGET_ATTR, buildNavGrid } from "../../admin-related-inline-table-arrow-navigation"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import type { AdminEntityDefinition } from "../../admin-entity-types"

interface UseRelatedInlineFocusRestoreOptions {
  childCfg: AdminEntityDefinition | undefined
  parentSlug: string
  collectionJsonKey: string
  relatedDraftGeneration: number
  linesRefForEmbedHydrate: React.MutableRefObject<LineRow[]>
}

interface UseRelatedInlineFocusRestoreResult {
  pendingRelatedInlineFocusRestoreRef: React.MutableRefObject<{
    el: HTMLElement
    clientKey: string
    ariaLabel: string | null
  } | null>
  pendingTabFocusTbodyRef: React.MutableRefObject<HTMLTableSectionElement | null>
  /**
   * When the pending tab-focus was triggered by the "Add empty row" button (which appends the new
   * row at the END, with no trailing empty after it), set this `true` so focus lands on the LAST row
   * rather than the second-to-last. Tab-add leaves it `false` (the new row is second-to-last because
   * normalizeTrailingDrafts keeps a trailing empty).
   */
  pendingTabFocusNewRowAtEndRef: React.MutableRefObject<boolean>
  captureFocusBeforeUpdate: (clientKey: string) => void
}

export function useRelatedInlineFocusRestore({
  childCfg,
  parentSlug,
  collectionJsonKey,
  relatedDraftGeneration,
  linesRefForEmbedHydrate,
}: UseRelatedInlineFocusRestoreOptions): UseRelatedInlineFocusRestoreResult {
  const pendingRelatedInlineFocusRestoreRef = useRef<{
    el: HTMLElement
    clientKey: string
    ariaLabel: string | null
  } | null>(null)

  const pendingTabFocusTbodyRef = useRef<HTMLTableSectionElement | null>(null)
  const pendingTabFocusNewRowAtEndRef = useRef(false)

  const captureFocusBeforeUpdate = (clientKey: string): void => {
    const ae = document.activeElement
    if (
      ae instanceof HTMLElement &&
      ae.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR) &&
      (ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement)
    ) {
      pendingRelatedInlineFocusRestoreRef.current = {
        el: ae,
        clientKey,
        ariaLabel: ae.getAttribute("aria-label"),
      }
    }
  }

  /**
   * Related draft sync bumps `useAdminRelatedInlineDraftSyncVersion`; this subtree may commit and
   * Radix focus-scope logic can move focus off the inline cell. Restore **after** that commit using
   * layout + one animation frame (microtasks run too early — before the bump's React commit).
   */
  useLayoutEffect(() => {
    const pending = pendingRelatedInlineFocusRestoreRef.current
    if (pending == null || !childCfg) return

    const idColKey = childCfg.idColumn.jsonKey ?? "id"
    const captured = pending
    pendingRelatedInlineFocusRestoreRef.current = null

    const applyFocus = (): void => {
      let target: HTMLElement | null = captured.el
      if (!target.isConnected) {
        const line = linesRefForEmbedHydrate.current.find(
          (l) => l.clientKey === captured.clientKey,
        )
        if (line != null && captured.ariaLabel) {
          const rowTestId = relatedInlineRowDataTestId({
            parentSlug,
            collectionJsonKey,
            line,
            idKey: idColKey,
          })
          const row = document.querySelector(
            `[data-testid="${escapeDataTestIdForAttributeSelector(rowTestId)}"]`,
          )
          if (row) {
            const labelled = row.querySelectorAll<HTMLElement>("[aria-label]")
            for (const cand of labelled) {
              if (
                cand.getAttribute("aria-label") === captured.ariaLabel &&
                cand.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR)
              ) {
                target = cand
                break
              }
            }
          }
        }
      }

      if (target == null || !target.isConnected) return
      const isRecentTarget = isRelatedInlineRecentKeydownTarget(target)
      const alreadyActive = document.activeElement === target
      if (alreadyActive) {
        /**
         * Already focused — leave the caret alone. Moving it to the end on every keystroke
         * (the previous behaviour) caused the browser's input event queue to interleave the
         * caret-reset with queued key events, dropping or reordering characters during fast typing.
         * Focus restore only needs to act when focus was *stolen* and is being *returned*.
         */
        return
      }
      if (
        isRecentTarget &&
        document.activeElement?.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR) &&
        document.activeElement !== target
      ) {
        /**
         * The user pressed Tab (or an arrow key) and focus legitimately moved to another
         * nav target in the same grid. An onBlur-triggered updateLine then caused a re-render
         * whose RAF fired this restore. Do not steal focus back — leave it on the element the
         * user navigated to.
         */
        return
      }
      /**
       * Focus was stolen by Radix's MutationObserver — always restore it so subsequent
       * keyboard events reach the input. However when the user is actively typing (isRecentTarget),
       * skip setSelectionRange: moving the cursor to end on every keystroke races with the
       * browser's queued key events and drops characters during fast typing.
       */
      try {
        markAdminRelatedInlineProgrammaticFocus(target)
        target.focus({ preventScroll: true })
      } catch {
        markAdminRelatedInlineProgrammaticFocus(target)
        target.focus()
      }
      if (isRecentTarget) return
      try {
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) {
          const len = target.value.length
          target.setSelectionRange(len, len)
        }
      } catch {
        /* ignore */
      }
    }

    requestAnimationFrame(() => {
      applyFocus()
    })
    /** Only the parent bump should trigger restore; avoid consuming pending on unrelated prop churn. */
  }, [relatedDraftGeneration]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * After addEmptyRow() fires via Tab, relatedDraftGeneration bumps (via onExtrasPayloadSynced).
   * Focus the new row's first nav-target: normalizeTrailingDrafts keeps the trailing empty at the
   * end, so the newly inserted row is second-to-last (grid.length - 2).
   */
  useLayoutEffect(() => {
    const tbody = pendingTabFocusTbodyRef.current
    if (tbody == null) return
    pendingTabFocusTbodyRef.current = null
    const newRowAtEnd = pendingTabFocusNewRowAtEndRef.current
    pendingTabFocusNewRowAtEndRef.current = false
    requestAnimationFrame(() => {
      const grid = buildNavGrid(tbody)
      if (grid.length === 0) return
      const targetRowIdx = newRowAtEnd
        ? grid.length - 1
        : grid.length >= 2
          ? grid.length - 2
          : 0
      const rowCells = grid[targetRowIdx]
      if (rowCells == null) return
      for (const cell of rowCells) {
        if (cell != null) {
          markAdminRelatedInlineProgrammaticFocus(cell)
          try {
            cell.focus({ preventScroll: true })
          } catch {
            cell.focus()
          }
          if (
            cell instanceof HTMLInputElement ||
            cell instanceof HTMLTextAreaElement
          ) {
            try {
              const len = cell.value.length
              cell.setSelectionRange(len, len)
            } catch {
              /* ignore */
            }
          }
          break
        }
      }
    })
  }, [relatedDraftGeneration]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pendingRelatedInlineFocusRestoreRef,
    pendingTabFocusTbodyRef,
    pendingTabFocusNewRowAtEndRef,
    captureFocusBeforeUpdate,
  }
}
