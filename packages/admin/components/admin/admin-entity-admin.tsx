"use client"

import { useEffect, useMemo, useState } from "react"

import { AdminEntityAdminCrudDialog } from "./admin-entity-admin-crud-dialog"
import { AdminEntityAdminListCard } from "./admin-entity-admin-list-card"
import { useAdminEntityAdmin } from "./use-admin-entity-admin"
import { resolveListFilterBypass } from "../../admin-entity-list-filter-bypass"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityDefinition } from "../../admin-entity-types"
import { formatUnknownErrorMessage } from "../../read-api-error"
import { useOptionalAdminListViewportChrome } from "../../admin-list-viewport-chrome-context"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import { AdminListClientHiddenRowsProvider } from "../../admin-list-client-hidden-rows-context"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { cn } from "@repo/ui/utils"
import { adminEntityLocksCrudOnCompactViewport } from "../../admin-entity-crud-compact-viewport"
import { adminEntityFormColumnsInOrder } from "../../admin-entity-form-column-order"
import { adminEntityListMobileCardFields } from "../../admin-entity-list-mobile-card-fields"

type AdminEntityAdminProps = {
  slug: AdminEntitySlug
  entityDefinition: AdminEntityDefinition
  listUrlSearch: string
}

export function AdminEntityAdmin({
  slug,
  entityDefinition: entityDefinitionFromProps,
  listUrlSearch,
}: AdminEntityAdminProps) {
  const {
    adminEntities,
    renderAdminEntityListGridItemBySlug,
    adminEntityListRowHideFromViewSlugs,
  } = useAdminClientRegistry()
  const rowHideFromViewEnabled =
    adminEntityListRowHideFromViewSlugs?.includes(slug) ?? false
  /** RSC props omit non-serializable callbacks; client bundle restores full defs. */
  const entityDefinition =
    (adminEntities[slug] as AdminEntityDefinition | undefined) ??
    entityDefinitionFromProps
  const listViewportChrome = useOptionalAdminListViewportChrome()
  const isCompactList = useCompactAdminListViewport()
  const listMobileCardResolved = useMemo(
    () => adminEntityListMobileCardFields(entityDefinition),
    [entityDefinition],
  )

  // Own the collapsible side-panel open state here, above the hidden-rows provider below. That
  // provider is keyed by the URL search and remounts the whole list card on every filter/search
  // change, so holding this state inside the card would snap the panel shut on each selection or
  // Clear. Initialise to the SSR-safe default (matches the server render to avoid a hydration
  // mismatch) and restore the saved choice on the client; persist it so the panel stays as the
  // user left it. Only matters when the panel is collapsible (currently panda-realty properties).
  const listSideFiltersPanelCollapsible =
    entityDefinition.listSideFiltersPanelCollapsible === true
  const sideFiltersPanelStorageKey = `admin:list:${slug}:side-filters-panel-open`
  const [sideFiltersPanelOpen, setSideFiltersPanelOpen] = useState(
    !listSideFiltersPanelCollapsible,
  )
  useEffect(() => {
    if (!listSideFiltersPanelCollapsible || typeof window === "undefined") return
    const stored = window.localStorage.getItem(sideFiltersPanelStorageKey)
    if (stored !== null) setSideFiltersPanelOpen(stored === "1")
  }, [listSideFiltersPanelCollapsible, sideFiltersPanelStorageKey])
  useEffect(() => {
    if (!listSideFiltersPanelCollapsible || typeof window === "undefined") return
    window.localStorage.setItem(
      sideFiltersPanelStorageKey,
      sideFiltersPanelOpen ? "1" : "0",
    )
  }, [listSideFiltersPanelCollapsible, sideFiltersPanelStorageKey, sideFiltersPanelOpen])
  const {
    cfg,
    listSearchEnabled,
    listSearchInput,
    setListSearchInput,
    listSearchTrigger,
    submitListSearch,
    clearListSearch,
    listSearchPlaceholder,
    listBooleanFilterEnabled,
    listBooleanFilterSegment,
    setListBooleanFilterSegment,
    listBooleanFilterLabels,
    listBooleanFilterGroupLabel,
    listBooleanFilterLayout,
    listBooleanFilterUiStyle,
    listAppendWhereHintFilterEnabled,
    listAppendWhereHintSpecs,
    listAppendWhereHintSegments,
    onListAppendWhereHintSegmentChange,
    listYearMonthFilterEnabled,
    listYearMonthFilterLabel,
    listYearMonthFilterSelectValue,
    listYearMonthFilterOptions,
    listYearMonthFilterPending,
    onListYearMonthFilterChange,
    listDateRangeFilterEnabled,
    listDateRangeFilterRows,
    createFormListDateFilterDefaults,
    onListDateRangeChange,
    listYearMonthFilterRequired,
    listRelationFilterEnabled,
    listRelationFilterRows,
    onRelationFilterChange,
    onRelationMultiFilterChange,
    hasActiveListFilters,
    clearAllListFilters,
    listFiltersDifferFromDefaults,
    resetListFiltersToDefaults,
    createCols,
    createEnabled,
    patchCols,
    crudDialog,
    openCreateDialog,
    closeCrudDialog,
    pageSizeOptions,
    listLimit,
    onPageSizeChange,
    listQuery,
    listPayload,
    totalCount,
    totalPages,
    displayPage,
    rowCount,
    goToPage,
    goNextPage,
    goPrevPage,
    createMutation,
    updateMutation,
    deleteMutation,
    requestDeleteRow,
    deleteLabelColumnKey,
    table,
    crudListRelationFieldOptions,
    onEditRelatedDetailLoaded,
    refetchEditDialogDetailFromApi,
    promoteCreateDialogToEditFromApiRow,
    startEdit,
    listCols,
    listTableQuickCompact,
    listTableColumnDividers,
    listQuickDesktopCards,
    listRowHighlight,
    listLayoutMode,
    setListLayoutMode,
  } = useAdminEntityAdmin(slug, entityDefinition, listUrlSearch)

  const listGridItemRenderer = useMemo(() => {
    const key = entityDefinition.listGrid?.registryGridItemKey
    if (key == null || key === "") return undefined
    return renderAdminEntityListGridItemBySlug?.[key]
  }, [entityDefinition.listGrid?.registryGridItemKey, renderAdminEntityListGridItemBySlug])

  // When an append-where hint (e.g. a map-area streetFilter) bypasses a toolbar filter server-side,
  // mirror that in the UI so the side-panel toggle/Status filter visibly sit in the off position
  // instead of looking like they are still narrowing the results. Display-only: the underlying
  // segment/relation values are untouched, so clearing the map filter restores them as they were.
  const sideFilterBypass = useMemo(
    () => resolveListFilterBypass(entityDefinition, listAppendWhereHintSegments),
    [entityDefinition, listAppendWhereHintSegments],
  )

  const crudDialogTarget = useMemo(() => {
    if (crudDialog.kind === "edit" && crudDialog.dialogEntitySlug != null) {
      const s = crudDialog.dialogEntitySlug as AdminEntitySlug
      const ed = adminEntities[s] as AdminEntityDefinition
      return {
        slug: s,
        entityDefinition: ed,
        patchCols: adminEntityFormColumnsInOrder(ed, "patch"),
        schemaSqlName: ed.schemaSqlName,
        singular: ed.ui.singular,
        crudDialogWidth: ed.crudDialogWidth,
        crudDialogHeight: ed.crudDialogHeight,
        crossPageFormLocked: crudDialog.crossPageFormLocked === true,
      }
    }
    return {
      slug,
      entityDefinition: cfg,
      patchCols,
      schemaSqlName: cfg.schemaSqlName,
      singular: cfg.ui.singular,
      crudDialogWidth: cfg.crudDialogWidth,
      crudDialogHeight: cfg.crudDialogHeight,
      crossPageFormLocked:
        crudDialog.kind === "edit" && crudDialog.crossPageFormLocked === true,
    }
  }, [adminEntities, crudDialog, cfg, patchCols, slug])

  const outerScrollClass =
    listViewportChrome?.fullViewportList === true
      ? "overflow-hidden"
      : "overflow-y-auto"

  const listHideRowActionsForList =
    entityDefinition.listHideRowActions === true ||
    entityDefinition.listHideRowActionsOnMobileCards === true
  const mobileCardOpenRowEnabled =
    !listHideRowActionsForList ||
    listMobileCardResolved.titleRowOpensEditDialog === true

  return (
    <div
      className={cn(
        "scrollbar-galaxy flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden",
        isCompactList ? "gap-2" : "gap-6",
        outerScrollClass,
      )}
      data-testid={`admin-entity-crud--${slug}`}
    >
      <AdminEntityAdminCrudDialog
        slug={crudDialogTarget.slug}
        entityDefinition={crudDialogTarget.entityDefinition}
        state={crudDialog}
        onOpenChange={(open) => {
          if (!open) closeCrudDialog()
        }}
        addCardTitle={cfg.ui.addCardTitle}
        schemaSqlName={crudDialogTarget.schemaSqlName}
        singular={crudDialogTarget.singular}
        createCols={createCols}
        createMutation={createMutation}
        patchCols={crudDialogTarget.patchCols}
        updateMutation={updateMutation}
        crudListRelationFieldOptions={crudListRelationFieldOptions}
        crudDialogWidth={crudDialogTarget.crudDialogWidth}
        crudDialogHeight={crudDialogTarget.crudDialogHeight}
        crossPageFormLocked={crudDialogTarget.crossPageFormLocked}
        onEditRelatedDetailLoaded={onEditRelatedDetailLoaded}
        refetchEditDialogDetailFromApi={refetchEditDialogDetailFromApi}
        promoteCreateDialogToEditFromApiRow={promoteCreateDialogToEditFromApiRow}
        createFormListDateFilterDefaults={createFormListDateFilterDefaults}
        onDelete={
          crudDialog.kind === "edit" &&
          crudDialogTarget.entityDefinition.crudEditDialogHideFooterDelete !== true
            ? () =>
                requestDeleteRow(
                  crudDialog.rowId,
                  crudDialog.values[deleteLabelColumnKey] ?? crudDialog.rowId,
                )
            : undefined
        }
        deletePending={deleteMutation.isPending}
        onAddNew={
          createEnabled &&
          crudDialogTarget.entityDefinition.crudEditDialogHideFooterAddNew !== true
            ? openCreateDialog
            : undefined
        }
      />
      <AdminListClientHiddenRowsProvider
        // Remount on a fresh search / filter change so the hidden set clears.
        key={`${slug}::${listUrlSearch}`}
        enabled={rowHideFromViewEnabled}
      >
      <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
        <AdminEntityAdminListCard
          slug={slug}
          listTitle={cfg.ui.listTitle}
          listShowListCardTitle={
            entityDefinition.listShowListCardTitle === true
          }
          listShowListCardTitleOnCompact={
            entityDefinition.listShowListCardTitleOnCompact === true
          }
          listSearchEnabled={listSearchEnabled}
          listSearchValue={listSearchInput}
          onListSearchChange={setListSearchInput}
          listSearchTrigger={listSearchTrigger}
          onListSearchSubmit={submitListSearch}
          onListSearchClear={clearListSearch}
          listSearchPlaceholder={listSearchPlaceholder}
          listBooleanFilterEnabled={listBooleanFilterEnabled}
          listBooleanFilterSegment={listBooleanFilterSegment}
          onListBooleanFilterChange={setListBooleanFilterSegment}
          listBooleanFilterLabels={listBooleanFilterLabels}
          listBooleanFilterGroupLabel={listBooleanFilterGroupLabel}
          listBooleanFilterLayout={listBooleanFilterLayout}
          listBooleanFilterUiStyle={listBooleanFilterUiStyle}
          listAppendWhereHintFilterEnabled={listAppendWhereHintFilterEnabled}
          listAppendWhereHintSpecs={listAppendWhereHintSpecs}
          listAppendWhereHintSegments={listAppendWhereHintSegments}
          onListAppendWhereHintSegmentChange={
            onListAppendWhereHintSegmentChange
          }
          listYearMonthFilterEnabled={listYearMonthFilterEnabled}
          listYearMonthFilterLabel={listYearMonthFilterLabel}
          listYearMonthFilterValue={listYearMonthFilterSelectValue}
          listYearMonthFilterAllowAll={!listYearMonthFilterRequired}
          listYearMonthFilterOptions={listYearMonthFilterOptions}
          listYearMonthFilterPending={listYearMonthFilterPending}
          onListYearMonthFilterChange={onListYearMonthFilterChange}
          listDateRangeFilterEnabled={listDateRangeFilterEnabled}
          listDateRangeFilterRows={listDateRangeFilterRows}
          onListDateRangeChange={onListDateRangeChange}
          listRelationFilterEnabled={listRelationFilterEnabled}
          listRelationFilterRows={listRelationFilterRows}
          onRelationFilterChange={onRelationFilterChange}
          onRelationMultiFilterChange={onRelationMultiFilterChange}
          onClearAllListFilters={clearAllListFilters}
          listFiltersClearDisabled={!hasActiveListFilters}
          listFiltersDifferFromDefaults={listFiltersDifferFromDefaults}
          onResetListFiltersToDefaults={resetListFiltersToDefaults}
          loadErrorLabel={cfg.ui.loadErrorLabel}
          emptyLabel={cfg.ui.emptyLabel}
          pageSizeOptions={pageSizeOptions}
          listLimit={listLimit}
          onPageSizeChange={onPageSizeChange}
          isLoading={listQuery.isLoading}
          isRefetching={listQuery.isFetching && !listQuery.isLoading}
          onListRefresh={() => void listQuery.refetch()}
          listCreateEnabled={
            createEnabled &&
            (!isCompactList || !adminEntityLocksCrudOnCompactViewport(cfg))
          }
          onOpenCreateDialog={openCreateDialog}
          addNewLabel={cfg.ui.addCardTitle}
          addNewDisabled={createMutation.isPending}
          isError={listQuery.isError}
          errorMessage={
            listQuery.isError ? listQuery.error.message : undefined
          }
          totalCount={totalCount}
          totalPages={totalPages}
          displayPage={displayPage}
          rowCount={rowCount}
          listPayload={listPayload}
          goToPage={goToPage}
          goNextPage={goNextPage}
          goPrevPage={goPrevPage}
          table={table}
          updateErrorMessage={
            updateMutation.isError
              ? formatUnknownErrorMessage(updateMutation.error)
              : undefined
          }
          deleteErrorMessage={
            deleteMutation.isError
              ? formatUnknownErrorMessage(deleteMutation.error)
              : undefined
          }
          listMobileCardFields={listMobileCardResolved.fields}
          listMobileCardTitleColumnKey={listMobileCardResolved.titleColumnKey}
          listMobileCardGroups={listMobileCardResolved.groups}
          listMobileCardHideTitleFieldLabel={
            listMobileCardResolved.hideTitleFieldLabel === true
          }
          listHideRowActions={listHideRowActionsForList}
          listCompactListCardDense={
            entityDefinition.listCompactListCardDense === true
          }
          listFiltersToolbarDense={
            entityDefinition.listFiltersToolbarDense === true
          }
          onMobileCardOpenRow={
            mobileCardOpenRowEnabled ? startEdit : undefined
          }
          titleRowOpensEditDialog={
            listMobileCardResolved.titleRowOpensEditDialog === true
          }
          onRowClick={
            entityDefinition.listRowClickOpensEditDialog === true
              ? startEdit
              : undefined
          }
          listHideDockAggregateFooter={
            entityDefinition.listHideDockAggregateFooter === true
          }
          listGrid={entityDefinition.listGrid}
          listCols={listCols}
          listTableQuickCompact={listTableQuickCompact}
          listTableColumnDividers={listTableColumnDividers}
          listStickyStartColumnKey={entityDefinition.listStickyStartColumnKey}
          listStickyStartRowLinksWidthPx={
            entityDefinition.listStickyStartRowLinksWidthPx
          }
          listQuickDesktopCards={listQuickDesktopCards}
          listRowHighlight={listRowHighlight}
          sideFilterBypass={sideFilterBypass}
          listSideFiltersPanelCollapsible={listSideFiltersPanelCollapsible}
          sideFiltersPanelOpen={sideFiltersPanelOpen}
          setSideFiltersPanelOpen={setSideFiltersPanelOpen}
          listLayoutMode={listLayoutMode}
          onListLayoutModeChange={setListLayoutMode}
          renderListGridItem={listGridItemRenderer}
        />
      </div>
      </AdminListClientHiddenRowsProvider>
    </div>
  )
}
