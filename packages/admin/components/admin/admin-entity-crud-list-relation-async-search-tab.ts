import type { QueryClient } from "@tanstack/react-query"
import type * as React from "react"

import { adminFinalizeAdjacentTabFocusAfterClose } from "../../admin-focus-adjacent-tab-stop"
import type { AdminFocusAdjacentAnchorHints } from "../../admin-focus-adjacent-tab-stop"
import {
  adminEntityRelatedRowDetailLabelQueryKey,
  fetchAdminEntityRelatedRowDetailLabel,
} from "../../admin-entity-relation-async-search-queries"
import type { AdminEntityDefinition } from "../../admin-entity-types"

export type AsyncRelationTabCloseCtx = {
  readonly tabExitRef: React.MutableRefObject<boolean>
  readonly options: readonly { readonly value: string; readonly label: string }[]
  readonly cmkdHighlightRef: React.MutableRefObject<string>
  readonly setOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly setPopoverSearch: React.Dispatch<React.SetStateAction<string>>
  readonly onBlur: () => void
  readonly trimmed: string
  readonly relCfg: AdminEntityDefinition | undefined
  readonly queryClient: QueryClient
  readonly labelColumnKeys: readonly string[]
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>
  readonly pendingAdjacentTabDirectionRef: React.MutableRefObject<1 | -1 | null>
  readonly onChange: (next: string) => void
  readonly tabAnchorHints: AdminFocusAdjacentAnchorHints
}

/**
 * Close the async-search popover and optionally commit the cmdk-highlighted (or first) option,
 * mirroring forward/back Tab from inside the popover. See call site for ordering constraints.
 */
export function closeAsyncRelationPopoverForTabNavigation(
  direction: 1 | -1,
  pickFirstMatch: boolean,
  ctx: AsyncRelationTabCloseCtx,
): void {
  const {
    tabExitRef,
    options,
    cmkdHighlightRef,
    setOpen,
    setPopoverSearch,
    onBlur,
    trimmed,
    relCfg,
    queryClient,
    labelColumnKeys,
    triggerRef,
    pendingAdjacentTabDirectionRef,
    onChange,
    tabAnchorHints,
  } = ctx

  tabExitRef.current = true
  /**
   * Close the popover **before** applying `onChange`. If we call `onChange` synchronously here,
   * parent `setLines` can re-render the inline table in the **same** React commit as `setOpen(false)`,
   * replacing/remounting cells so `adminFinalizeAdjacentTabFocusAfterClose` never lands on Qty.
   * Defer the pick to a microtask so layout effects run on a stable row, then commit the selection.
   */
  const pick =
    pickFirstMatch && options.length > 0
      ? (options.find((o) => o.value === cmkdHighlightRef.current)?.value ??
        options[0]!.value)
      : null
  setOpen(false)
  setPopoverSearch("")
  onBlur()

  const pickTrimmed = pick?.trim() ?? ""
  const needsRowDetailBeforeFocus =
    pick != null && pickTrimmed !== "" && pick !== trimmed && relCfg != null

  if (needsRowDetailBeforeFocus) {
    /**
     * Wait for the same GET as `useAdminEntityRelatedRowDetailLabel` so the trigger label cache
     * is warm before we advance focus — avoids tab-order / layout settling racing the row fetch.
     */
    pendingAdjacentTabDirectionRef.current = null
    queueMicrotask(() => {
      const t = triggerRef.current
      if (t?.isConnected) {
        try {
          t.focus({ preventScroll: true })
        } catch {
          t.focus()
        }
      }
    })
    void queryClient
      .fetchQuery({
        queryKey: adminEntityRelatedRowDetailLabelQueryKey(relCfg, pick),
        queryFn: () =>
          fetchAdminEntityRelatedRowDetailLabel(relCfg, labelColumnKeys, pick),
        staleTime: 60_000,
      })
      .catch(() => {
        /* Still commit selection and advance focus; hook can refetch label. */
      })
      .then(() => {
        queueMicrotask(() => {
          onChange(pick)
          queueMicrotask(() => {
            adminFinalizeAdjacentTabFocusAfterClose(
              triggerRef.current,
              direction,
              tabAnchorHints,
              { retryProfile: "short" },
            )
          })
        })
      })
    return
  }

  pendingAdjacentTabDirectionRef.current = direction
  if (pick != null) {
    queueMicrotask(() => {
      onChange(pick)
    })
  }
}

export function handleAsyncRelationPopoverTabCapture(
  e: React.KeyboardEvent,
  closeForTabNavigation: (direction: 1 | -1, pickFirstMatch: boolean) => void,
): void {
  if (e.key !== "Tab") return
  if (e.altKey || e.ctrlKey || e.metaKey) return
  e.preventDefault()
  e.stopPropagation()
  if (e.shiftKey) {
    closeForTabNavigation(-1, false)
    return
  }
  closeForTabNavigation(1, true)
}

export type AsyncRelationTriggerKeyboardCtx = {
  readonly disabled: boolean
  readonly open: boolean
  readonly trimmed: string
  readonly popoverSearchSeedWhenOpening: string
  readonly skipSeedOnOpenChangeRef: React.MutableRefObject<boolean>
  readonly setOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly setPopoverSearch: React.Dispatch<React.SetStateAction<string>>
  readonly closeForTabNavigation: (direction: 1 | -1, pickFirstMatch: boolean) => void
  readonly alwaysStartWithEmptySearch?: boolean
}

/** Keyboard when focus is on the combobox trigger (open or closed). */
export function handleAsyncRelationTriggerKeyDown(
  e: React.KeyboardEvent<HTMLButtonElement>,
  ctx: AsyncRelationTriggerKeyboardCtx,
): void {
  const {
    disabled,
    open,
    trimmed,
    popoverSearchSeedWhenOpening,
    skipSeedOnOpenChangeRef,
    setOpen,
    setPopoverSearch,
    closeForTabNavigation,
    alwaysStartWithEmptySearch = false,
  } = ctx

  if (disabled) return
  if (open) {
    if (e.nativeEvent.isComposing) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      closeForTabNavigation(1, true)
    }
    return
  }
  if (e.nativeEvent.isComposing) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === "Tab" || e.key === "Escape") return

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    skipSeedOnOpenChangeRef.current = true
    if (trimmed !== "" && !alwaysStartWithEmptySearch) setPopoverSearch(popoverSearchSeedWhenOpening)
    else setPopoverSearch("")
    setOpen(true)
    return
  }

  if (e.key === "Backspace") {
    e.preventDefault()
    skipSeedOnOpenChangeRef.current = true
    setPopoverSearch(trimmed.length > 0 ? trimmed.slice(0, -1) : "")
    setOpen(true)
    return
  }

  if (e.key.length === 1) {
    e.preventDefault()
    skipSeedOnOpenChangeRef.current = true
    setPopoverSearch(e.key)
    setOpen(true)
  }
}
