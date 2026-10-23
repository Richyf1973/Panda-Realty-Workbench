"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { adminEntityRelationOptionLabel } from "../../admin-entity-relation-filter-option-label"
import { formatRelationFilterAsyncSearchFieldsHint } from "../../admin-entity-relation-filter-async-search-hint"
import { useOptionalAdminNestedEntityCrud } from "./admin-nested-entity-crud-context"
import {
  adminFinalizeAdjacentTabFocusAfterClose,
  adminFocusAdjacentTabStop,
} from "../../admin-focus-adjacent-tab-stop"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntityDefinition } from "../../admin-entity-types"

import {
  closeAsyncRelationPopoverForTabNavigation,
  handleAsyncRelationPopoverTabCapture,
  handleAsyncRelationTriggerKeyDown,
} from "./admin-entity-crud-list-relation-async-search-tab"
import {
  deriveCreateRelatedButtonState,
  openRelatedCreateDialog,
} from "./admin-entity-crud-list-relation-async-search-create"
import {
  buildRelationTriggerSummary,
} from "./admin-entity-crud-list-relation-async-search-helpers"
import { useRelationListQuery } from "./use-admin-entity-crud-list-relation-async-search-query"
import type {
  UseAdminEntityCrudListRelationAsyncSearchProps,
  UseAdminEntityCrudListRelationAsyncSearchResult,
} from "./admin-entity-crud-list-relation-async-search-types"

export type {
  UseAdminEntityCrudListRelationAsyncSearchProps,
  UseAdminEntityCrudListRelationAsyncSearchResult,
} from "./admin-entity-crud-list-relation-async-search-types"

export function useAdminEntityCrudListRelationAsyncSearch(
  props: UseAdminEntityCrudListRelationAsyncSearchProps,
): UseAdminEntityCrudListRelationAsyncSearchResult {
  const {
    col,
    htmlForId,
    "data-testid": dataTestId,
    ariaLabel,
    required,
    value,
    onChange,
    onBlur,
    emptyChoiceLabel,
    allowClear,
    disabled = false,
    compact = false,
    relationFilterSelections,
    relatedInlineArrowNavTarget = false,
    relationDetailEmbed,
    preloadedOptions,
    relationSearchListBooleanFilter,
    relationSearchAllowEmptyFetch,
    excludeRelatedRowIds,
    eagerFetchSelectedRelationLabel = false,
    relationPreloadPending,
    alwaysStartWithEmptySearch = false,
  } = props

  const listRel = col.listRelation

  const queryClient = useQueryClient()
  const {
    adminEntities,
    adminUiMutationsDisabled = false,
  } = useAdminClientRegistry()
  const nestedCrud = useOptionalAdminNestedEntityCrud()
  const relatedSlug = listRel.relatedEntitySlug
  const relCfg = adminEntities[relatedSlug] as AdminEntityDefinition | undefined

  const invalidateRelatedEntityRelationOptions = React.useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey
        return (
          Array.isArray(k) &&
          k[0] === "admin-entity-relation-filter-options" &&
          k[1] === relatedSlug
        )
      },
    })
  }, [queryClient, relatedSlug])

  const labelColumnKeys = listRel.labelColumnKeys

  const showEmptyQueryHint = listRel.asyncSearchShowEmptyQueryHint === true

  const derivedHint = formatRelationFilterAsyncSearchFieldsHint(relCfg)
  const explicitCrudHint = listRel.crudAsyncSearchMatchesHint?.trim() ?? ""
  const showMatchesHint =
    explicitCrudHint !== "" ||
    listRel.crudAsyncSearchShowMatchesHint === true
  const matchesHint =
    explicitCrudHint ||
    (derivedHint != null
      ? `Server search matches: ${derivedHint}.`
      : "Results load from the server as you type.")
  const compoundIdAndLabel = listRel.crudAsyncSearchCompoundIdAndLabel === true
  const createRel = listRel.crudAsyncSearchCreateRelated

  const trimmed = value.trim()
  const [allowDetailLabelFetch, setAllowDetailLabelFetch] = React.useState(false)
  React.useEffect(() => {
    setAllowDetailLabelFetch(false)
  }, [trimmed])

  const [open, setOpen] = React.useState(false)
  const openRef = React.useRef(open)
  React.useEffect(() => {
    openRef.current = open
  }, [open])
  const [popoverSearch, setPopoverSearch] = React.useState("")
  /** cmdk list highlight (arrow keys); Tab commits this value, not always `options[0]`. */
  const [commandListValue, setCommandListValue] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const tabExitRef = React.useRef(false)
  /**
   * Mirrors cmdk's internally-highlighted value on every render via
   * `CommandListValueSync`. This is always the first *visible* filtered item,
   * so Tab-to-pick reads the correct match without creating a state-update loop.
   */
  const cmkdHighlightRef = React.useRef("")
  /** Set when Tab closes the popover; cleared in `useLayoutEffect` after moving focus (survives parent rerender). */
  const pendingAdjacentTabDirectionRef = React.useRef<1 | -1 | null>(null)
  const tabAnchorHints = React.useMemo(
    () => ({
      htmlForId,
      dataTestId: `${dataTestId}--trigger`,
    }),
    [dataTestId, htmlForId],
  )
  /** When true, `onOpenChange(true)` must not replace `popoverSearch` (keyboard-open already set it). */
  const skipSeedOnOpenChangeRef = React.useRef(false)

  const embedMatchesStoredFk = React.useMemo(() => {
    if (relationDetailEmbed == null || relCfg == null || trimmed === "") {
      return false
    }
    const rid = relationDetailEmbed[relCfg.idColumn.jsonKey]
    if (rid == null) return false
    return String(rid).trim() === trimmed
  }, [relationDetailEmbed, relCfg, trimmed])

  const labelFromInlineEmbed = React.useMemo(() => {
    if (!embedMatchesStoredFk || relationDetailEmbed == null || relCfg == null) {
      return ""
    }
    const l = adminEntityRelationOptionLabel(
      relationDetailEmbed,
      labelColumnKeys,
      relCfg.columns,
    )
    return l.trim()
  }, [
    embedMatchesStoredFk,
    labelColumnKeys,
    relationDetailEmbed,
    relCfg,
  ])

  const {
    hasScopedRelationFilters,
    usingPreloadedOptions,
    queryingServerFromPreloadedSearch,
    trimmedPopoverSearch,
    mergedRelatedListSearchOpts,
    debouncedSearch,
    listQuery,
    labelFromPreloaded,
    selectedLabelQuery,
    excludeIdSet,
    options,
    exactIdMatchForQuery,
    idKey,
    relatedColumns,
  } = useRelationListQuery({
    relCfg,
    listRel,
    preloadedOptions,
    open,
    popoverSearch,
    value,
    trimmed,
    relationFilterSelections,
    relationSearchListBooleanFilter,
    relationSearchAllowEmptyFetch,
    excludeRelatedRowIds,
    eagerFetchSelectedRelationLabel,
    embedMatchesStoredFk,
    allowDetailLabelFetch,
  })

  const isPreloaded = preloadedOptions != null

  /** cmdk selects the full query on focus; collapse so the next keystroke appends (e.g. typeahead from closed combobox). */
  const collapseAsyncSearchInputCaretToEnd = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const input = e.currentTarget
      const placeCaretAtEnd = () => {
        if (document.activeElement !== input) return
        const len = input.value.length
        try {
          input.setSelectionRange(len, len)
        } catch {
          /* ignore */
        }
      }
      queueMicrotask(placeCaretAtEnd)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          placeCaretAtEnd()
          window.setTimeout(placeCaretAtEnd, 0)
        })
      })
    },
    [],
  )

  React.useLayoutEffect(() => {
    if (open) return
    const d = pendingAdjacentTabDirectionRef.current
    if (d == null) return
    pendingAdjacentTabDirectionRef.current = null
    adminFinalizeAdjacentTabFocusAfterClose(
      triggerRef.current,
      d,
      tabAnchorHints,
    )
  }, [open, tabAnchorHints])

  React.useLayoutEffect(() => {
    if (!open) return
    skipSeedOnOpenChangeRef.current = false
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>(
          `[data-testid="${dataTestId}--search-input"]`,
        )
        if (!el) return
        el.focus()
        const len = el.value.length
        try {
          el.setSelectionRange(len, len)
        } catch {
          /* ignore */
        }
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, dataTestId])

  const {
    showCreateRelatedFooter,
    createRelatedButtonEnabled,
    createRelatedButtonLabel,
    createRelatedDisabledTitle,
  } = deriveCreateRelatedButtonState({
    createRel,
    disabled,
    open,
    nestedCrud,
    adminUiMutationsDisabled,
    trimmedPopoverQuery: trimmedPopoverSearch,
    exactIdMatchForQuery,
    usingPreloadedOptions,
    listQueryIsError: listQuery.isError,
    relCfg,
  })

  const handleOpenRelatedCreateDialog = () =>
    openRelatedCreateDialog({
      createRelatedButtonEnabled,
      createRel,
      nestedCrud,
      relCfg,
      relatedSlug,
      trimmedPopoverQuery: trimmedPopoverSearch,
      queryClient,
      setOpen,
      setPopoverSearch,
      onChange,
      onBlur,
      invalidateRelatedEntityRelationOptions,
    })

  React.useEffect(() => {
    if (!open) {
      setCommandListValue("")
      return
    }
    if (options.length === 0) {
      setCommandListValue("")
      return
    }
    setCommandListValue((prev) =>
      options.some((o) => o.value === prev) ? prev : options[0]!.value,
    )
  }, [open, options])

  const resolvedName = isPreloaded
    ? labelFromPreloaded
    : (selectedLabelQuery.data ?? "").trim()
  const effectiveRelationLabel = labelFromInlineEmbed || resolvedName
  const triggerSummary = buildRelationTriggerSummary({
    trimmed,
    emptyChoiceLabel,
    compoundIdAndLabel,
    isPreloaded,
    selectedLabelIsPending: selectedLabelQuery.isPending,
    labelFromInlineEmbed,
    effectiveRelationLabel,
    value,
    resolvedName,
  })

  const popoverSearchSeedWhenOpening =
    trimmed === ""
      ? ""
      : labelFromInlineEmbed !== ""
        ? labelFromInlineEmbed
        : resolvedName !== "" && resolvedName !== trimmed
          ? resolvedName
          : trimmed

  const handleTriggerBlur = React.useCallback(
    (e: React.FocusEvent<HTMLButtonElement>) => {
      const related = e.relatedTarget as HTMLElement | null
      if (related?.closest?.("[data-radix-popper-content-wrapper]") != null) {
        return
      }
      queueMicrotask(() => {
        const ae = document.activeElement as HTMLElement | null
        if (ae?.closest?.("[data-radix-popper-content-wrapper]") != null) return
        if (openRef.current) return
        setAllowDetailLabelFetch(true)
      })
    },
    [],
  )

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      if (!skipSeedOnOpenChangeRef.current && trimmed !== "" && !alwaysStartWithEmptySearch) {
        setPopoverSearch(popoverSearchSeedWhenOpening)
      }
    } else {
      setPopoverSearch("")
      onBlur()
    }
  }

  const finishSelect = (next: string) => {
    onChange(next)
    setOpen(false)
    setPopoverSearch("")
    onBlur()
  }

  const closeForTabNavigation = React.useCallback(
    (direction: 1 | -1, pickFirstMatch: boolean) => {
      closeAsyncRelationPopoverForTabNavigation(direction, pickFirstMatch, {
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
      })
    },
    [
      options,
      trimmed,
      relCfg,
      queryClient,
      labelColumnKeys,
      onChange,
      onBlur,
      tabAnchorHints,
    ],
  )

  const handlePopoverTabCapture = React.useCallback(
    (e: React.KeyboardEvent) => {
      handleAsyncRelationPopoverTabCapture(e, closeForTabNavigation)
    },
    [closeForTabNavigation],
  )

  const openFromTriggerKeyboard = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      handleAsyncRelationTriggerKeyDown(e, {
        disabled,
        open,
        trimmed,
        popoverSearchSeedWhenOpening,
        skipSeedOnOpenChangeRef,
        setOpen,
        setPopoverSearch,
        closeForTabNavigation,
        alwaysStartWithEmptySearch,
      })
    },
    [
      disabled,
      open,
      trimmed,
      popoverSearchSeedWhenOpening,
      closeForTabNavigation,
      alwaysStartWithEmptySearch,
    ],
  )

  const handleTriggerKeyDownCapture = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return
      if (open || disabled) return
      e.preventDefault()
      adminFocusAdjacentTabStop(
        triggerRef.current,
        e.shiftKey ? -1 : 1,
        tabAnchorHints,
      )
    },
    [open, disabled, tabAnchorHints],
  )

  return {
    // Derived config
    dataTestId,
    showMatchesHint,
    matchesHint,
    showEmptyQueryHint,
    showCreateRelatedFooter,
    createRelatedButtonEnabled,
    createRelatedButtonLabel,
    createRelatedDisabledTitle,
    allowClear,
    compact,
    disabled,
    ariaLabel,
    htmlForId,
    required,
    emptyChoiceLabel,
    relatedInlineArrowNavTarget,

    // State & derived values
    open,
    popoverSearch,
    commandListValue,
    triggerSummary,
    options,
    debouncedSearch,
    usingPreloadedOptions,
    queryingServerFromPreloadedSearch,
    hasScopedRelationFilters,
    mergedRelatedListSearchOpts,
    trimmed,

    // Query state
    listQueryIsFetching: listQuery.isFetching,
    listQueryIsError: listQuery.isError,
    listQueryError: listQuery.error,
    relationPreloadPending,

    // Refs
    triggerRef,
    cmkdHighlightRef,
    tabExitRef,
    pendingAdjacentTabDirectionRef,

    // Callbacks
    setCommandListValue,
    setPopoverSearch,
    handleOpenChange,
    finishSelect,
    collapseAsyncSearchInputCaretToEnd,
    handleTriggerBlur,
    handlePopoverTabCapture,
    openFromTriggerKeyboard,
    openRelatedCreateDialog: handleOpenRelatedCreateDialog,
    handleTriggerKeyDownCapture,

    // Tab anchor hints
    tabAnchorHints,
  }
}
