"use client"

import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@repo/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu"

import type { AdminEntityRowActionDescriptor } from "./admin-entity-row-action-descriptor"
import {
  DescriptorIconButton,
  DescriptorMenuItem,
  IconActionButton,
} from "./admin-entity-row-action-buttons"
import { useAdminRowActionsCollapsed } from "./admin-row-actions-collapse-context"
import { resolveRowActionsLayout } from "./admin-entity-row-actions-layout"

export type AdminEntityRowActionsProps = {
  entitySlug: string
  rowId: string
  updatePending: boolean
  deletePending: boolean
  onStartEdit: () => void
  /** Runs after the user confirms delete (include confirm + mutation in the parent). */
  onDelete: () => void
  disableEdit?: boolean
  /** Browse-only: one control opens the row in read-only dialog (no delete). */
  viewOnly?: boolean
  /** Extra action buttons rendered before the standard edit/delete controls (legacy ReactNode). */
  extraActions?: ReactNode
  /** Controls that always stay inline (e.g. hide-from-view tick, locate-on-map) plus dialog mounts. */
  pinnedActions?: ReactNode
  /**
   * Responsive actions: when provided, this row uses the collapse behaviour — these actions plus
   * Edit/Delete fold into a single overflow menu when the table is too narrow (see
   * {@link useAdminRowActionsCollapsed}), while {@link pinnedActions} stay inline. When omitted, the
   * row falls back to the legacy inline-icons / mobile-dropdown layout (unchanged for other apps).
   */
  collapsibleActions?: AdminEntityRowActionDescriptor[]
  /**
   * Pinned-only rows: render ONLY {@link pinnedActions} (no Edit/Delete, no overflow, no collapsible
   * icons). Used by browse-style views like the panda map results, where each row should show just its
   * inline controls (hide tick + locate-on-map). Requires the responsive path (set `pinnedActions`).
   */
  pinnedOnly?: boolean
}

/**
 * Admin CRUD row actions. Two layouts:
 * - **Legacy** (no `collapsibleActions`): inline edit/delete icons from `md` up, compact dropdown
 *   below `md` — unchanged behaviour for entities that don't opt into responsive collapse.
 * - **Responsive** (`collapsibleActions` provided): renders once; inline when there is room, and a
 *   single overflow menu (collapsible actions + Edit/Delete) when the table is narrow, with
 *   `pinnedActions` always inline.
 */
export function AdminEntityRowActions({
  entitySlug,
  rowId,
  updatePending,
  deletePending,
  onStartEdit,
  onDelete,
  disableEdit = false,
  viewOnly = false,
  extraActions,
  pinnedActions,
  collapsibleActions,
  pinnedOnly = false,
}: AdminEntityRowActionsProps) {
  const scope = `admin-entity-row-actions--${entitySlug}--${rowId}`
  const collapsed = useAdminRowActionsCollapsed()
  const editDisabled = disableEdit || deletePending || updatePending

  if (viewOnly) {
    return (
      <div className="flex justify-end" data-testid={scope}>
        <div className="hidden md:flex">
          <IconActionButton
            tooltip="View row"
            variant="outline"
            size="icon-sm"
            disabled={editDisabled}
            data-testid={`admin-entity-row-edit--${entitySlug}--${rowId}`}
            aria-label="View row"
            onClick={onStartEdit}
          >
            <Eye data-icon="inline-start" />
          </IconActionButton>
        </div>
        <div className="md:hidden">
          <IconActionButton
            tooltip="View row"
            variant="outline"
            size="icon-sm"
            disabled={editDisabled}
            data-testid={`admin-entity-row-edit--${entitySlug}--${rowId}`}
            aria-label="View row"
            onClick={onStartEdit}
          >
            <Eye data-icon="inline-start" />
          </IconActionButton>
        </div>
      </div>
    )
  }

  const collapsibleList = collapsibleActions ?? []
  // Gating the responsive layout on collapsible actions alone would drop pinnedActions for pinned-only
  // rows (e.g. the map results), which fell through to the legacy edit/delete-only path. Resolve the
  // layout from both pinned and collapsible presence (see resolveRowActionsLayout).
  const layout = resolveRowActionsLayout({
    hasPinned: pinnedActions != null,
    collapsibleCount: collapsibleList.length,
    pinnedOnly,
  })

  // ── Pinned-only path: render just the inline pinned controls, no Edit/Delete/overflow ─────────
  if (layout === "pinned-only") {
    return (
      <div
        className="flex flex-nowrap items-center justify-end gap-1"
        data-testid={scope}
      >
        {pinnedActions ?? null}
      </div>
    )
  }

  // ── Responsive path (opt-in via pinned or collapsible actions) ───────────────────────────────
  if (layout === "responsive") {
    if (collapsed) {
      return (
        <div
          className="flex flex-nowrap items-center justify-end gap-1"
          data-testid={scope}
        >
          {pinnedActions ?? null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Row actions"
                data-testid={`admin-entity-row-actions-overflow--${entitySlug}--${rowId}`}
              >
                <MoreVertical data-icon="inline-start" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-44"
              data-testid={`admin-entity-row-actions-overflow-menu--${entitySlug}--${rowId}`}
            >
              {collapsibleList.map((d) => (
                <DescriptorMenuItem key={d.key} d={d} />
              ))}
              {collapsibleList.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={editDisabled}
                data-testid={`admin-entity-row-edit--${entitySlug}--${rowId}`}
                onSelect={() => {
                  onStartEdit()
                }}
              >
                <Pencil data-icon="inline-start" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={deletePending}
                data-testid={`admin-entity-row-delete--${entitySlug}--${rowId}`}
                onSelect={() => {
                  onDelete()
                }}
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }

    return (
      <div
        className="flex flex-nowrap items-center justify-end gap-1"
        data-testid={scope}
      >
        {pinnedActions ?? null}
        {collapsibleList.map((d) => (
          <DescriptorIconButton key={d.key} d={d} />
        ))}
        <IconActionButton
          tooltip="Edit row"
          variant="outline"
          size="icon-sm"
          disabled={editDisabled}
          data-testid={`admin-entity-row-edit--${entitySlug}--${rowId}`}
          aria-label="Edit row"
          onClick={onStartEdit}
        >
          <Pencil data-icon="inline-start" />
        </IconActionButton>
        <IconActionButton
          tooltip="Delete row"
          variant="destructive"
          size="icon-sm"
          disabled={deletePending}
          data-testid={`admin-entity-row-delete--${entitySlug}--${rowId}`}
          aria-label="Delete row"
          onClick={onDelete}
        >
          <Trash2 data-icon="inline-start" />
        </IconActionButton>
      </div>
    )
  }

  // ── Legacy path (unchanged): inline icons ≥ md, compact dropdown < md ─────────
  return (
    <div className="flex justify-end" data-testid={scope}>
      <div className="hidden flex-nowrap items-center justify-end gap-1 md:flex">
        {extraActions ?? null}
        <IconActionButton
          tooltip="Edit row"
          variant="outline"
          size="icon-sm"
          disabled={editDisabled}
          data-testid={`admin-entity-row-edit--${entitySlug}--${rowId}`}
          aria-label="Edit row"
          onClick={onStartEdit}
        >
          <Pencil data-icon="inline-start" />
        </IconActionButton>
        <IconActionButton
          tooltip="Delete row"
          variant="destructive"
          size="icon-sm"
          disabled={deletePending}
          data-testid={`admin-entity-row-delete--${entitySlug}--${rowId}`}
          aria-label="Delete row"
          onClick={onDelete}
        >
          <Trash2 data-icon="inline-start" />
        </IconActionButton>
      </div>
      <div className="flex flex-nowrap items-center justify-end gap-1 md:hidden">
        {extraActions ?? null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Row actions"
              data-testid={`admin-entity-row-actions-menu--${entitySlug}--${rowId}`}
            >
              <MoreVertical data-icon="inline-start" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-40"
            data-testid={`admin-entity-row-actions-dropdown--${entitySlug}--${rowId}`}
          >
            <DropdownMenuItem
              disabled={editDisabled}
              data-testid={`admin-entity-row-edit--${entitySlug}--${rowId}`}
              onSelect={() => {
                onStartEdit()
              }}
            >
              <Pencil data-icon="inline-start" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={deletePending}
              data-testid={`admin-entity-row-delete--${entitySlug}--${rowId}`}
              onSelect={() => {
                onDelete()
              }}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
