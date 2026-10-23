"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"

import { AdminEntityAdminCrudDialog } from "@repo/admin/components/admin/admin-entity-admin-crud-dialog"
import { useAdminEntityAdmin } from "@repo/admin/components/admin/use-admin-entity-admin"
import { Button } from "@repo/ui/button"

import { propertyStatusEntity } from "@/lib/admin/entities/propertyStatus"
import type { PropertyStatusRow } from "./queries"
import { reorderPropertyStatuses } from "./reorder-action"

// ── Row cells ────────────────────────────────────────────────────────────────

function RowCells({ row }: { row: PropertyStatusRow }) {
  return (
    <>
      <div className="w-14 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        {row.propertyStatusId}
      </div>
      <div className="flex-1 min-w-0 font-mono text-sm truncate">
        {row.propertyStatusCode}
      </div>
      <div className="w-24 shrink-0 text-sm text-muted-foreground capitalize">
        {row.pipeline ?? <span className="text-muted-foreground/40">—</span>}
      </div>
      <div className="w-20 shrink-0 text-sm text-center">
        {row.isShownOnFavorite ? (
          <span className="text-green-500">✓</span>
        ) : (
          <span className="text-red-400/70">✕</span>
        )}
      </div>
    </>
  )
}

// ── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  row,
  isReorderPending,
  onEdit,
  onDelete,
}: {
  row: PropertyStatusRow
  isReorderPending: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.propertyStatusId })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "flex items-center gap-2 px-3 py-2 border-b border-border/50 text-sm select-none",
        "hover:bg-muted/30",
        isDragging ? "opacity-0" : "",
        isReorderPending ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Drag handle — only this element is the drag activator */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing w-6 shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </div>

      <RowCells row={row} />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Edit"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          aria-label="Delete"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Drag overlay ─────────────────────────────────────────────────────────────

function DragOverlayRow({ row }: { row: PropertyStatusRow }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-border bg-background shadow-lg rounded-md text-sm cursor-grabbing">
      <div className="flex items-center justify-center text-muted-foreground w-6 shrink-0">
        <GripVertical className="size-4" />
      </div>
      <RowCells row={row} />
    </div>
  )
}

// ── Main client component ────────────────────────────────────────────────────

type Props = {
  initialRows: PropertyStatusRow[]
}

export function PropertyStatusAdminClient({ initialRows }: Props) {
  const [rows, setRows] = useState<PropertyStatusRow[]>(initialRows)
  const [activeRow, setActiveRow] = useState<PropertyStatusRow | null>(null)
  const [isReorderPending, startReorderTransition] = useTransition()
  const [reorderError, setReorderError] = useState<string | null>(null)

  const router = useRouter()

  const {
    crudDialog,
    openCreateDialog,
    closeCrudDialog,
    createCols,
    patchCols,
    createMutation,
    updateMutation,
    deleteMutation,
    requestDeleteRow,
    crudListRelationFieldOptions,
    onEditRelatedDetailLoaded,
    createFormListDateFilterDefaults,
    deleteLabelColumnKey,
    startEdit,
  } = useAdminEntityAdmin("property-status", propertyStatusEntity, "", { disableListQuery: true })

  // When the server re-fetches (after router.refresh()), sync the new rows down
  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  // Refresh SSR data after any CRUD mutation — use a ref to fire exactly once per
  // mutation success, not on every re-render while isSuccess remains true.
  const refreshedForMutationRef = useRef<string | null>(null)
  useEffect(() => {
    const key = createMutation.isSuccess
      ? `create-${createMutation.submittedAt}`
      : updateMutation.isSuccess
        ? `update-${updateMutation.submittedAt}`
        : deleteMutation.isSuccess
          ? `delete-${deleteMutation.submittedAt}`
          : null
    if (key && key !== refreshedForMutationRef.current) {
      refreshedForMutationRef.current = key
      router.refresh()
    }
  }, [
    createMutation.isSuccess, createMutation.submittedAt,
    updateMutation.isSuccess, updateMutation.submittedAt,
    deleteMutation.isSuccess, deleteMutation.submittedAt,
    router,
  ])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const found = rows.find((r) => r.propertyStatusId === event.active.id)
    setActiveRow(found ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveRow(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rows.findIndex((r) => r.propertyStatusId === active.id)
    const newIndex = rows.findIndex((r) => r.propertyStatusId === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const prevRows = rows
    const reordered = arrayMove(rows, oldIndex, newIndex)
    setRows(reordered)
    setReorderError(null)

    startReorderTransition(async () => {
      const result = await reorderPropertyStatuses(reordered.map((r) => r.propertyStatusId))
      if (!result.success) {
        setRows(prevRows)
        setReorderError(result.error ?? "Failed to save order")
      }
    })
  }

  // ── Edit handler ───────────────────────────────────────────────────────────

  function handleEdit(row: PropertyStatusRow) {
    startEdit({
      propertyStatusId: row.propertyStatusId,
      propertyStatusCode: row.propertyStatusCode,
      propertyStatus: row.propertyStatus ?? "",
      isShownOnFavorite: row.isShownOnFavorite,
      pipeline: row.pipeline ?? "",
      slug: "",
      createdAt: "",
      updatedAt: "",
      sortOrder: row.sortOrder ?? "",
    } as unknown as Parameters<typeof startEdit>[0])
  }

  return (
    <>
      {/* CRUD dialog — renders into a portal, always in the DOM for dialog state */}
      <AdminEntityAdminCrudDialog
        slug="property-status"
        entityDefinition={propertyStatusEntity}
        state={crudDialog}
        onOpenChange={(open) => { if (!open) closeCrudDialog() }}
        addCardTitle={propertyStatusEntity.ui.addCardTitle}
        schemaSqlName={propertyStatusEntity.schemaSqlName}
        singular={propertyStatusEntity.ui.singular}
        createCols={createCols}
        createMutation={createMutation}
        patchCols={patchCols}
        updateMutation={updateMutation}
        crudListRelationFieldOptions={crudListRelationFieldOptions}
        createFormListDateFilterDefaults={createFormListDateFilterDefaults}
        onEditRelatedDetailLoaded={onEditRelatedDetailLoaded}
        onDelete={
          crudDialog.kind === "edit"
            ? () => requestDeleteRow(
                crudDialog.rowId,
                crudDialog.values[deleteLabelColumnKey] ?? crudDialog.rowId,
              )
            : undefined
        }
        deletePending={deleteMutation.isPending}
        onAddNew={openCreateDialog}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Drag to set board column order
        </p>
        <Button
          type="button"
          size="sm"
          onClick={openCreateDialog}
        >
          <Plus className="size-4" />
          Add property status
        </Button>
      </div>

      {/* Drag-to-reorder table */}
      <div className="rounded-md border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="w-6 shrink-0" />
          <div className="w-14 shrink-0">ID</div>
          <div className="flex-1 min-w-0">Code</div>
          <div className="w-24 shrink-0">Pipeline</div>
          <div className="w-20 shrink-0 text-center">Favorites</div>
          <div className="shrink-0 ml-auto w-[4.5rem]" />
        </div>

        <DndContext
          id="property-status-reorder-context"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.propertyStatusId)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {rows.map((row) => (
                <SortableRow
                  key={row.propertyStatusId}
                  row={row}
                  isReorderPending={isReorderPending}
                  onEdit={() => handleEdit(row)}
                  onDelete={() =>
                    requestDeleteRow(
                      String(row.propertyStatusId),
                      row.propertyStatusCode,
                    )
                  }
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeRow ? <DragOverlayRow row={activeRow} /> : null}
          </DragOverlay>
        </DndContext>

        {isReorderPending && (
          <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 border-t border-border">
            Saving order…
          </div>
        )}
        {reorderError && (
          <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/5 border-t border-destructive/20">
            {reorderError}
          </div>
        )}
      </div>
    </>
  )
}
