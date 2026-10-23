import type * as React from "react"
import type { AdminEntityColumn } from "../../admin-entity-types"

export interface UseAdminEntityCrudListRelationAsyncSearchProps {
  /** col.listRelation is guaranteed non-null (outer component guards this). */
  col: AdminEntityColumn & { listRelation: NonNullable<AdminEntityColumn["listRelation"]> }
  htmlForId: string
  "data-testid": string
  ariaLabel: string
  required: boolean
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  emptyChoiceLabel: string
  allowClear: boolean
  disabled?: boolean
  compact?: boolean
  relationFilterSelections?: Record<string, string>
  relatedInlineArrowNavTarget?: boolean
  relationDetailEmbed?: Record<string, unknown> | null
  preloadedOptions?: readonly { value: string; label: string }[]
  relationSearchListBooleanFilter?: { param: string; value: boolean }
  relationSearchAllowEmptyFetch?: boolean
  excludeRelatedRowIds?: readonly string[]
  eagerFetchSelectedRelationLabel?: boolean
  relationPreloadPending?: boolean
  alwaysStartWithEmptySearch?: boolean
}

export interface UseAdminEntityCrudListRelationAsyncSearchResult {
  // Derived config
  dataTestId: string
  showMatchesHint: boolean
  matchesHint: string
  showEmptyQueryHint: boolean
  showCreateRelatedFooter: boolean
  createRelatedButtonEnabled: boolean
  createRelatedButtonLabel: string
  createRelatedDisabledTitle: string | undefined
  allowClear: boolean
  compact: boolean
  disabled: boolean
  ariaLabel: string
  htmlForId: string
  required: boolean
  emptyChoiceLabel: string
  relatedInlineArrowNavTarget: boolean

  // State & derived values
  open: boolean
  popoverSearch: string
  commandListValue: string
  triggerSummary: string
  options: { value: string; label: string }[]
  debouncedSearch: string
  usingPreloadedOptions: boolean
  queryingServerFromPreloadedSearch: boolean
  hasScopedRelationFilters: boolean
  mergedRelatedListSearchOpts:
    | {
        relationFilterSelections?: Record<string, string>
        listBooleanFilter?: { param: string; value: boolean }
        allowEmptySearchFetch?: boolean
      }
    | undefined
  trimmed: string

  // Query state
  listQueryIsFetching: boolean
  listQueryIsError: boolean
  listQueryError: Error | null
  relationPreloadPending: boolean | undefined

  // Refs
  triggerRef: React.RefObject<HTMLButtonElement | null>
  cmkdHighlightRef: React.RefObject<string>
  tabExitRef: React.RefObject<boolean>
  pendingAdjacentTabDirectionRef: React.RefObject<1 | -1 | null>

  // Callbacks
  setCommandListValue: (v: string) => void
  setPopoverSearch: (v: string) => void
  handleOpenChange: (next: boolean) => void
  finishSelect: (next: string) => void
  collapseAsyncSearchInputCaretToEnd: (e: React.FocusEvent<HTMLInputElement>) => void
  handleTriggerBlur: (e: React.FocusEvent<HTMLButtonElement>) => void
  handlePopoverTabCapture: (e: React.KeyboardEvent) => void
  openFromTriggerKeyboard: (e: React.KeyboardEvent<HTMLButtonElement>) => void
  openRelatedCreateDialog: () => Promise<void>
  handleTriggerKeyDownCapture: (e: React.KeyboardEvent<HTMLButtonElement>) => void

  // Tab anchor hints (needed in JSX for focus helpers)
  tabAnchorHints: { htmlForId: string; dataTestId: string }
}
