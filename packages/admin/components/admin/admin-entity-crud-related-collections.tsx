"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useLayoutEffect } from "react"

import { useAdminCrudFormInteractionLockRegister } from "../../admin-crud-form-interaction-lock-context"
import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityCrudRelatedCollection,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import { isAdminEntityCrudRelatedCollectionTable } from "../../admin-entity-types"
import { readApiErrorMessage } from "../../read-api-error"
import { defaultTabValueFromJsonKey } from "../../admin-entity-crud-related-inline-helpers"
import { AdminEntityCrudRelatedCustomPanel } from "./admin-entity-crud-related-custom-panel"
import { RelatedCollectionInlineTable } from "./related-collection-inline-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs"
import { cn } from "@repo/ui/utils"

export function AdminEntityCrudRelatedCollectionsSection({
  slug,
  entityDefinition,
  variant,
  entityRowId,
  listDetailSeed,
  onExtrasPayloadSynced,
  onEditDetailPayloadLoaded,
  parentCrudForm,
  parentCrossPageViewOnly = false,
  splitRightCollectionJsonKey,
  splitRightPanelClassName,
  /** Refetches parent GET detail — updates cache and optional `listDetailSeed` after side-effect APIs. */
  refetchParentEntityDetail,
  promoteCreateDialogToEditFromApiRow,
}: {
  slug: AdminEntitySlug
  entityDefinition: AdminEntityDefinition
  variant: "create" | "edit"
  entityRowId: string | null
  /** When present and matches every related collection key, skips GET `/api/.../[id]`. */
  listDetailSeed?: Record<string, unknown>
  /** Fires after each related-table draft is merged into `adminEntityCrudExtrasForSaveRef`. */
  onExtrasPayloadSynced?: () => void
  /**
   * Edit: when the entity detail GET succeeds (same payload as related editors), lets the parent
   * merge `listDetailSeed` for main-form rollups that read nested `payrolls` before inactive tabs mount.
   */
  onEditDetailPayloadLoaded?: (detail: Record<string, unknown>) => void
  /** Live parent edit form values for related toolbars (e.g. computed rounded pay). */
  parentCrudForm?: AdminEntityCrudFormSubscribeApi
  /** When the parent edit dialog is cross-page view-only (e.g. opened from another list). */
  parentCrossPageViewOnly?: boolean
  /**
   * When set to a table collection’s `jsonKey`, that collection renders in a **right column** on
   * large viewports; remaining collections use tabs (or a single panel) on the left.
   */
  splitRightCollectionJsonKey?: string
  /**
   * Extra classes for the split **right** column wrapper (merged after defaults). Use to widen the
   * side panel when the default `lg:max-w-[min(28rem,40vw)]` is too tight for that collection’s columns.
   */
  splitRightPanelClassName?: string
  refetchParentEntityDetail?: () => Promise<void>
  promoteCreateDialogToEditFromApiRow?: (
    createdRow: Record<string, unknown>,
  ) => void
}) {
  const collections = entityDefinition.crudRelatedCollections
  const tableCollections =
    collections?.filter(isAdminEntityCrudRelatedCollectionTable) ?? []
  const {
    adminEntityCrudPatchOmitExtrasKeysRef,
    adminEntityCrudExtrasForSaveRef,
  } = useAdminClientRegistry()

  useLayoutEffect(() => {
    if (!adminEntityCrudExtrasForSaveRef) return
    const keys = [
      ...(entityDefinition.extraCreateBodyKeys ?? []),
      ...(entityDefinition.extraPatchBodyKeys ?? []),
    ]
    for (const k of keys) {
      delete adminEntityCrudExtrasForSaveRef.current[k]
    }
  }, [slug, variant, entityRowId, adminEntityCrudExtrasForSaveRef, entityDefinition])

  const hasTrustedListSeed =
    variant === "edit" &&
    listDetailSeed != null &&
    tableCollections.length > 0 &&
    tableCollections.every((c) => Array.isArray(listDetailSeed[c.jsonKey]))

  const detailQuery = useQuery({
    queryKey: ["admin", "entity-detail", slug, entityRowId],
    enabled:
      variant === "edit" &&
      entityRowId != null &&
      entityRowId !== "" &&
      tableCollections.length > 0 &&
      !hasTrustedListSeed,
    queryFn: async () => {
      const res = await fetch(
        `${entityDefinition.apiBase}/${encodeURIComponent(entityRowId!)}`,
        { cache: "no-store" },
      )
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return res.json() as Promise<Record<string, unknown>>
    },
  })

  const detailPayload =
    hasTrustedListSeed && listDetailSeed != null
      ? listDetailSeed
      : detailQuery.data
  /** Use `isLoading` (in-flight fetch), not `isPending`: disabled queries stay `isPending` with no data in v5. */
  const detailPending = !hasTrustedListSeed && detailQuery.isLoading
  const detailError =
    !hasTrustedListSeed && detailQuery.isError
      ? detailQuery.error.message
      : null
  const detailReady = hasTrustedListSeed || detailQuery.isSuccess

  useAdminCrudFormInteractionLockRegister(detailPending)

  useEffect(() => {
    if (variant !== "edit" || !onEditDetailPayloadLoaded) return
    if (!detailQuery.isSuccess || detailQuery.data == null) return
    onEditDetailPayloadLoaded(detailQuery.data as Record<string, unknown>)
  }, [
    variant,
    onEditDetailPayloadLoaded,
    detailQuery.isSuccess,
    detailQuery.data,
  ])

  useLayoutEffect(() => {
    if (!adminEntityCrudPatchOmitExtrasKeysRef) return
    const omitKeys = entityDefinition.extraPatchOmitUntilDetailLoaded
    if (!omitKeys?.length) return
    if (variant === "edit") {
      for (const k of omitKeys) {
        adminEntityCrudPatchOmitExtrasKeysRef.current.add(k)
      }
    } else {
      for (const k of omitKeys) {
        adminEntityCrudPatchOmitExtrasKeysRef.current.delete(k)
      }
    }
  }, [variant, entityRowId, slug, entityDefinition, adminEntityCrudPatchOmitExtrasKeysRef])

  useEffect(() => {
    if (!adminEntityCrudPatchOmitExtrasKeysRef) return
    const omitKeys = entityDefinition.extraPatchOmitUntilDetailLoaded
    if (!omitKeys?.length) return
    if (variant === "edit" && detailReady) {
      for (const k of omitKeys) {
        adminEntityCrudPatchOmitExtrasKeysRef.current.delete(k)
      }
    }
  }, [
    variant,
    detailReady,
    entityDefinition,
    adminEntityCrudPatchOmitExtrasKeysRef,
  ])

  if (!collections?.length) return null

  const trimmedSplitKey = splitRightCollectionJsonKey?.trim()
  const sideCollectionForSplit =
    trimmedSplitKey != null && trimmedSplitKey !== ""
      ? collections.find(
          (c) =>
            isAdminEntityCrudRelatedCollectionTable(c) &&
            c.jsonKey === trimmedSplitKey,
        )
      : undefined
  const mainCollectionsForSplit =
    sideCollectionForSplit != null
      ? collections.filter((c) => c.jsonKey !== trimmedSplitKey)
      : collections
  const useSplitRightLayout =
    sideCollectionForSplit != null && mainCollectionsForSplit.length > 0

  const renderRelatedCollectionBody = (c: AdminEntityCrudRelatedCollection) =>
    isAdminEntityCrudRelatedCollectionTable(c) ? (
      <RelatedCollectionInlineTable
        parentSlug={slug}
        collection={c}
        variant={variant}
        entityRowId={entityRowId}
        detailPayload={detailPayload}
        detailPending={detailPending}
        detailError={detailError}
        onExtrasPayloadSynced={onExtrasPayloadSynced}
        parentCrudForm={parentCrudForm}
        parentCrossPageViewOnly={parentCrossPageViewOnly}
        refetchParentEntityDetail={refetchParentEntityDetail}
        promoteCreateDialogToEditFromApiRow={
          promoteCreateDialogToEditFromApiRow
        }
      />
    ) : (
      <AdminEntityCrudRelatedCustomPanel
        parentSlug={slug}
        collection={c}
        variant={variant}
        entityRowId={entityRowId}
        detailPayload={detailPayload}
        detailPending={detailPending}
        detailError={detailError}
      />
    )

  if (useSplitRightLayout) {
    const main = mainCollectionsForSplit
    const side = sideCollectionForSplit!
    const mainFirst = main[0]!
    const mainDefaultTab =
      mainFirst.tabValue ?? defaultTabValueFromJsonKey(mainFirst.jsonKey)

    const mainNav =
      main.length === 1 ? (
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          data-testid={`admin-entity-crud-related-panel--${slug}--${main[0]!.tabValue ?? defaultTabValueFromJsonKey(main[0]!.jsonKey)}`}
        >
          {renderRelatedCollectionBody(main[0]!)}
        </div>
      ) : (
        <Tabs
          defaultValue={mainDefaultTab}
          className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2"
        >
          <TabsList
            className="relative z-10 flex h-auto min-h-11 w-full shrink-0 flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg border border-border/70 bg-muted/90 p-1 text-muted-foreground shadow-inner [scrollbar-width:thin] tab-scroll-fade-x sm:min-h-10"
            data-testid={`admin-entity-crud-related-tabs--${slug}`}
          >
            {main.map((c) => {
              const v = c.tabValue ?? defaultTabValueFromJsonKey(c.jsonKey)
              return (
                <TabsTrigger
                  key={c.jsonKey}
                  value={v}
                  className="min-h-9 shrink-0 cursor-pointer justify-center px-2.5 text-center text-xs leading-tight whitespace-nowrap transition-[color,background-color,box-shadow,transform] hover:bg-background/80 hover:text-foreground data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background/25 data-[state=active]:border-transparent data-[state=active]:shadow-sm active:scale-[0.99] sm:min-w-0 sm:flex-1 sm:basis-0 sm:px-1.5 sm:text-sm"
                  data-testid={`admin-entity-crud-related-tab--${slug}--${v}`}
                >
                  {c.tabLabel}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {main.map((c) => {
            const v = c.tabValue ?? defaultTabValueFromJsonKey(c.jsonKey)
            return (
              <TabsContent
                key={c.jsonKey}
                value={v}
                forceMount
                className="flex min-h-0 flex-1 flex-col overflow-hidden pt-3 data-[state=inactive]:hidden"
                data-testid={`admin-entity-crud-related-panel--${slug}--${v}`}
              >
                {renderRelatedCollectionBody(c)}
              </TabsContent>
            )
          })}
        </Tabs>
      )

    const sideV = side.tabValue ?? defaultTabValueFromJsonKey(side.jsonKey)
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border/80 border-t px-2 pt-3 pb-2 sm:px-4 sm:pt-4 lg:flex-row lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-border/80 lg:pr-4">
          {mainNav}
        </div>
        <div
          className={cn(
            "mt-4 flex min-h-[min(36vh,14rem)] min-w-0 shrink-0 flex-col overflow-hidden border-border/80 border-t pt-3 lg:mt-0 lg:max-w-[min(28rem,40vw)] lg:min-w-[18rem] lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0",
            splitRightPanelClassName,
          )}
          data-testid={`admin-entity-crud-related-split-right--${slug}`}
        >
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            data-testid={`admin-entity-crud-related-panel--${slug}--${sideV}`}
          >
            {renderRelatedCollectionBody(side)}
          </div>
        </div>
      </div>
    )
  }

  const first = collections[0]!
  const defaultTab =
    first.tabValue ?? defaultTabValueFromJsonKey(first.jsonKey)

  if (collections.length === 1) {
    const c = collections[0]!
    const v = c.tabValue ?? defaultTabValueFromJsonKey(c.jsonKey)
    return (
      <div
        className="flex min-h-[min(20vh,10rem)] min-w-0 flex-1 flex-col overflow-hidden border-border/80 border-t px-2 pt-3 pb-2 sm:px-4 sm:pt-4"
        data-testid={`admin-entity-crud-related-single--${slug}`}
      >
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          data-testid={`admin-entity-crud-related-panel--${slug}--${v}`}
        >
          {renderRelatedCollectionBody(c)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[min(20vh,10rem)] min-w-0 flex-1 flex-col overflow-hidden border-border/80 border-t px-2 pt-3 pb-2 sm:px-4 sm:pt-4">
      <Tabs
        defaultValue={defaultTab}
        className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2"
      >
        <TabsList
          className="relative z-10 flex h-auto min-h-11 w-full shrink-0 flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-lg border border-border/70 bg-muted/90 p-1 text-muted-foreground shadow-inner [scrollbar-width:thin] tab-scroll-fade-x sm:min-h-10"
          data-testid={`admin-entity-crud-related-tabs--${slug}`}
        >
          {collections.map((c) => {
            const v = c.tabValue ?? defaultTabValueFromJsonKey(c.jsonKey)
            return (
              <TabsTrigger
                key={c.jsonKey}
                value={v}
                className="min-h-9 shrink-0 cursor-pointer justify-center px-2.5 text-center text-xs leading-tight whitespace-nowrap transition-[color,background-color,box-shadow,transform] hover:bg-background/80 hover:text-foreground data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background/25 data-[state=active]:border-transparent data-[state=active]:shadow-sm active:scale-[0.99] sm:min-w-0 sm:flex-1 sm:basis-0 sm:px-1.5 sm:text-sm"
                data-testid={`admin-entity-crud-related-tab--${slug}--${v}`}
              >
                {c.tabLabel}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {collections.map((c) => {
          const v = c.tabValue ?? defaultTabValueFromJsonKey(c.jsonKey)
          return (
            <TabsContent
              key={c.jsonKey}
              value={v}
              forceMount
              className="flex min-h-0 flex-1 flex-col overflow-hidden pt-3 data-[state=inactive]:hidden"
              data-testid={`admin-entity-crud-related-panel--${slug}--${v}`}
            >
              {renderRelatedCollectionBody(c)}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
