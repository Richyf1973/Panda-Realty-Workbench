"use client"

import * as React from "react"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Command,
  CommandInput,
  CommandList,
} from "@repo/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/popover"
import { cn } from "@repo/ui/utils"

import { adminRelatedInlineNavTargetDomProps } from "../../admin-related-inline-table-arrow-navigation"
import type { AdminEntityColumn } from "../../admin-entity-types"

import {
  AdminEntityAsyncSearchListContent,
  CommandListValueSync,
} from "./admin-entity-crud-list-relation-async-search-list-content"
import {
  useAdminEntityCrudListRelationAsyncSearch,
  type UseAdminEntityCrudListRelationAsyncSearchProps,
} from "./use-admin-entity-crud-list-relation-async-search"

// ---------------------------------------------------------------------------
// Public props (same as before — the outer component's public API is unchanged)
// ---------------------------------------------------------------------------

type AdminEntityCrudListRelationAsyncSearchControlProps = {
  col: AdminEntityColumn
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
  /** Row embed for this FK (e.g. `propertyEntity`) when it matches `value`. */
  relationDetailEmbed?: Record<string, unknown> | null
  /**
   * When provided, the combobox skips server queries entirely and filters these options
   * client-side as the user types (cmdk built-in filtering). Used with `preloadedSearch`
   * variant where all options are pre-fetched upfront.
   */
  preloadedOptions?: readonly { value: string; label: string }[]
  /** Adds boolean list filter params to the related entity list request (e.g. favorites-only). */
  relationSearchListBooleanFilter?: { param: string; value: boolean }
  /** When set with `relationSearchListBooleanFilter`, fetches the first page even before the user types. */
  relationSearchAllowEmptyFetch?: boolean
  /** Exclude related rows whose primary id matches one of these strings (e.g. already-linked properties). */
  excludeRelatedRowIds?: readonly string[]
  /**
   * When true, **`GET`** the selected related row for the trigger label as soon as **`value`** is
   * non-empty, even while the popover is closed (default defers until open or trigger blur).
   */
  eagerFetchSelectedRelationLabel?: boolean
  /**
   * When **`preloadedOptions`** is used, mirrors React Query **`isPending`** for the relation-option
   * fetch so the popover can show a skeleton instead of an empty list.
   */
  relationPreloadPending?: boolean
  /**
   * When true, the popover search input always opens blank regardless of the currently-selected
   * value. Prevents prefilling the search with the selected label, so all options are shown
   * immediately when `relationSearchAllowEmptyFetch` is also set.
   */
  alwaysStartWithEmptySearch?: boolean
}

// ---------------------------------------------------------------------------
// Outer component — guards the null listRelation case
// ---------------------------------------------------------------------------

export function AdminEntityCrudListRelationAsyncSearchControl(
  props: AdminEntityCrudListRelationAsyncSearchControlProps,
) {
  if (props.col.listRelation == null) return null
  // Safe cast: we just checked listRelation is non-null
  return (
    <AdminEntityCrudListRelationAsyncSearchInner
      {...(props as UseAdminEntityCrudListRelationAsyncSearchProps)}
    />
  )
}

// ---------------------------------------------------------------------------
// Inner component — calls the hook and renders
// ---------------------------------------------------------------------------

function AdminEntityCrudListRelationAsyncSearchInner(
  props: UseAdminEntityCrudListRelationAsyncSearchProps,
) {
  const {
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
    relatedInlineArrowNavTarget,
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
    listQueryIsFetching,
    listQueryIsError,
    listQueryError,
    relationPreloadPending,
    triggerRef,
    cmkdHighlightRef,
    tabExitRef,
    setCommandListValue,
    setPopoverSearch,
    handleOpenChange,
    finishSelect,
    collapseAsyncSearchInputCaretToEnd,
    handleTriggerBlur,
    handlePopoverTabCapture,
    openFromTriggerKeyboard,
    openRelatedCreateDialog,
    handleTriggerKeyDownCapture,
    tabAnchorHints,
  } = useAdminEntityCrudListRelationAsyncSearch(props)

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        showMatchesHint ? "gap-1" : "gap-0",
      )}
      data-testid={dataTestId}
    >
      {showMatchesHint ? (
        <p className="text-xs leading-snug text-muted-foreground">{matchesHint}</p>
      ) : null}
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            id={htmlForId}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            aria-required={required}
            disabled={disabled}
            {...(relatedInlineArrowNavTarget
              ? adminRelatedInlineNavTargetDomProps(`${dataTestId}--trigger`)
              : { "data-testid": `${dataTestId}--trigger` })}
            onKeyDown={openFromTriggerKeyboard}
            onBlur={handleTriggerBlur}
            onKeyDownCapture={handleTriggerKeyDownCapture}
            className={cn(
              "w-full min-w-0 justify-between font-normal",
              compact ? "h-8 px-2 text-xs" : "min-h-9 px-3 text-sm",
              trimmed === "" && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">{triggerSummary}</span>
            <ChevronsUpDownIcon
              data-icon="inline-end"
              className="size-4 shrink-0 opacity-50"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="z-80 flex max-h-[min(85vh,26rem)] w-[min(100vw-2rem,24rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 shadow-lg ring-1 ring-border/80"
          onKeyDownCapture={handlePopoverTabCapture}
          onCloseAutoFocus={(ev) => {
            if (tabExitRef.current) {
              ev.preventDefault()
              tabExitRef.current = false
            }
          }}
        >
          <Command
            shouldFilter={usingPreloadedOptions}
            value={commandListValue}
            onValueChange={setCommandListValue}
            className={cn(
              "flex h-auto min-h-0 w-full flex-col overflow-hidden rounded-none border-0 bg-transparent p-0",
            )}
          >
            <CommandInput
              placeholder={`Type to search…`}
              value={popoverSearch}
              onValueChange={setPopoverSearch}
              onFocus={collapseAsyncSearchInputCaretToEnd}
              onKeyDownCapture={handlePopoverTabCapture}
              data-testid={`${dataTestId}--search-input`}
              className={compact ? "h-8 text-xs" : undefined}
              autoComplete="off"
            />
            <CommandListValueSync highlightRef={cmkdHighlightRef} />
            <CommandList
              className={cn(
                "min-h-0 max-h-60 touch-pan-y overscroll-y-contain scrollbar-galaxy",
              )}
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <AdminEntityAsyncSearchListContent
                isPreloaded={usingPreloadedOptions}
                isQueryingServerFromPreloadedSearch={queryingServerFromPreloadedSearch}
                relationPreloadPending={relationPreloadPending}
                open={open}
                isFetching={listQueryIsFetching}
                isError={listQueryIsError}
                error={listQueryError}
                debouncedSearch={debouncedSearch}
                hasScopedRelationFilters={hasScopedRelationFilters}
                allowEmptySearchFetch={mergedRelatedListSearchOpts?.allowEmptySearchFetch === true}
                options={options}
                popoverSearch={popoverSearch}
                showEmptyQueryHint={showEmptyQueryHint}
                compact={compact}
                onSelect={finishSelect}
              />
            </CommandList>
          </Command>
          {showCreateRelatedFooter ? (
            <div className="shrink-0 border-t border-border bg-popover p-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1.5 font-normal",
                  compact && "h-8 text-xs",
                )}
                disabled={!createRelatedButtonEnabled}
                title={
                  !createRelatedButtonEnabled
                    ? createRelatedDisabledTitle
                    : undefined
                }
                data-testid={`${dataTestId}--open-create-related`}
                onClick={openRelatedCreateDialog}
              >
                <PlusIcon className="size-3.5 shrink-0 opacity-80" />
                {createRelatedButtonLabel}
              </Button>
            </div>
          ) : null}
          {allowClear ? (
            <div className="shrink-0 border-t border-border bg-popover p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("w-full font-normal", compact && "h-8 text-xs")}
                aria-label={`Clear ${ariaLabel}`}
                data-testid={`${dataTestId}--clear`}
                disabled={trimmed === ""}
                onClick={() => finishSelect("")}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
