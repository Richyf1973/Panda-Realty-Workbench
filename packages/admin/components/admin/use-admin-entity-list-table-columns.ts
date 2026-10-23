"use client"

import { useMemo, type ReactNode } from "react"

import type { AdminEntityTableRow } from "../../admin-entity-admin-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import type {
  AdminResolveListQuickDesktopCardsActive,
  AdminResolveListTableColumnKeys,
  AdminTransformListTableColumns,
} from "../../admin-client-registry-context"

import { adminEntityPropertiesQuickDesktopCardsActive } from "./admin-entity-properties-quick-desktop-cards"
import { resolveAdminEntityListColsForTable } from "./use-admin-entity-admin-list-cols"

export type UseAdminEntityListTableColumnsArgs = {
  readonly slug: AdminEntitySlug
  readonly cfg: AdminEntityDefinition
  readonly listAppendWhereHintSegments: Readonly<Record<string, string>>
  /** Stable key for `listAppendWhereHintSegments` (memo deps). */
  readonly listAppendWhereHintSegmentsKey: string
  readonly listSearchForRequest: string
  readonly relationFilterSelections: Readonly<Record<string, string>>
  readonly relationFilterStableKey: string
  readonly listLayoutMode: "table" | "grid"
  readonly isCompactListViewport: boolean
  readonly listBooleanFilterSegment: "all" | "true" | "false"
  readonly resolveListTableColumnKeys?: AdminResolveListTableColumnKeys
  readonly resolveListQuickDesktopCardsActive?: AdminResolveListQuickDesktopCardsActive
  readonly transformListTableColumns?: AdminTransformListTableColumns
  readonly renderAdminEntityListRowLinks?: (args: {
    readonly slug: string
    readonly row: AdminEntityTableRow
    readonly compactRowLinks?: boolean
  }) =>
    | readonly {
        readonly href: string | null
        readonly icon: ReactNode
        readonly tooltip: string
      }[]
    | null
    | undefined
}

/**
 * Resolves visible list table columns, optional quick-compact chrome (Panda properties), and the
 * row-links renderer wired with `compactRowLinks`. Extracted from {@link useAdminEntityAdmin}.
 */
export function useAdminEntityListTableColumns({
  slug,
  cfg,
  listAppendWhereHintSegments,
  listAppendWhereHintSegmentsKey,
  listSearchForRequest,
  relationFilterSelections,
  relationFilterStableKey,
  listLayoutMode,
  isCompactListViewport,
  listBooleanFilterSegment,
  resolveListTableColumnKeys,
  resolveListQuickDesktopCardsActive,
  transformListTableColumns,
  renderAdminEntityListRowLinks,
}: UseAdminEntityListTableColumnsArgs) {
  const listCols = useMemo(
    () =>
      resolveAdminEntityListColsForTable({
        resolveListTableColumnKeys,
        transformListTableColumns,
        slug,
        cfg,
        listAppendWhereHintSegments,
        listSearchForRequest,
        relationFilterSelections,
        listLayoutMode,
        isCompactListViewport,
        listBooleanFilterSegment,
      }),
    [
      resolveListTableColumnKeys,
      transformListTableColumns,
      slug,
      cfg,
      listAppendWhereHintSegmentsKey,
      listSearchForRequest,
      relationFilterStableKey,
      listLayoutMode,
      isCompactListViewport,
      listBooleanFilterSegment,
    ],
  )

  const resolveArgs = useMemo(
    () => ({
      slug,
      cfg,
      listAppendWhereHintSegments,
      listSearchDebounced: listSearchForRequest,
      relationFilterSelections,
      listLayoutMode,
      isCompactListViewport,
      listBooleanFilterSegment,
    }),
    [
      slug,
      cfg,
      listAppendWhereHintSegments,
      listAppendWhereHintSegmentsKey,
      listSearchForRequest,
      relationFilterStableKey,
      listLayoutMode,
      isCompactListViewport,
      listBooleanFilterSegment,
    ],
  )

  const hasQuickColumnKeys = useMemo(() => {
    const keys = resolveListTableColumnKeys?.(resolveArgs)
    return keys != null && keys.length > 0
  }, [resolveListTableColumnKeys, resolveArgs])

  const hasQuickDesktopCardsColumnKeys = useMemo(
    () =>
      resolveListQuickDesktopCardsActive != null
        ? resolveListQuickDesktopCardsActive(resolveArgs)
        : hasQuickColumnKeys,
    [resolveListQuickDesktopCardsActive, resolveArgs, hasQuickColumnKeys],
  )

  const listQuickDesktopCards = useMemo(
    () =>
      adminEntityPropertiesQuickDesktopCardsActive({
        slug,
        isCompactListViewport,
        listLayoutMode,
        hasQuickColumnKeys: hasQuickDesktopCardsColumnKeys,
      }),
    [slug, isCompactListViewport, listLayoutMode, hasQuickDesktopCardsColumnKeys],
  )

  const listQuickRowLinksCompact = useMemo(
    () =>
      slug === "properties" &&
      !isCompactListViewport &&
      hasQuickColumnKeys,
    [slug, isCompactListViewport, hasQuickColumnKeys],
  )

  const listTableQuickCompact = useMemo(() => {
    if (listQuickDesktopCards) return false
    if (
      slug !== "properties" ||
      listLayoutMode !== "table" ||
      isCompactListViewport
    ) {
      return false
    }
    return hasQuickColumnKeys
  }, [
    listQuickDesktopCards,
    slug,
    listLayoutMode,
    isCompactListViewport,
    hasQuickColumnKeys,
  ])

  const listTableColumnDividers = useMemo(() => {
    if (slug !== "properties" || listLayoutMode !== "table" || isCompactListViewport) return false
    if (listBooleanFilterSegment !== "true") return false
    if (listQuickDesktopCards) return false
    return hasQuickColumnKeys && !hasQuickDesktopCardsColumnKeys
  }, [
    slug,
    listLayoutMode,
    isCompactListViewport,
    listBooleanFilterSegment,
    listQuickDesktopCards,
    hasQuickColumnKeys,
    hasQuickDesktopCardsColumnKeys,
  ])

  // Only expose a row-links renderer when the app actually registered one. Returning `undefined`
  // here (rather than an always-defined wrapper) means apps with no `renderAdminEntityListRowLinks`
  // never get the otherwise-empty "Links" column built at all (see `buildLinksColumn` gating).
  const renderListRowLinksForTable = useMemo(
    () =>
      renderAdminEntityListRowLinks == null
        ? undefined
        : (args: { readonly slug: string; readonly row: AdminEntityTableRow }) =>
            renderAdminEntityListRowLinks({
              ...args,
              compactRowLinks: listQuickRowLinksCompact,
            }),
    [renderAdminEntityListRowLinks, listQuickRowLinksCompact],
  )

  return {
    listCols,
    listTableQuickCompact,
    listTableColumnDividers,
    listQuickDesktopCards,
    renderListRowLinksForTable,
  }
}
