"use client"

import { GripVertical, Home, User } from "lucide-react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@repo/ui/utils"

import { BUYER_AGING, getBuyerAgingColor } from "@/lib/admin/buyer-aging"
import type { MergedBuyerCard } from "./buyer-pipeline-queries"
import type { PipelineStage } from "./queries"
import { colId } from "./kanban-sellers-column"

export function buyerCardId(entityId: number, stageId: number) {
  return `buyer-${entityId}-${stageId}`
}

const AGING_STAGE_IDS = new Set([
  BUYER_AGING.STAGE_IDS.ACTIVE_BUYERS,
  BUYER_AGING.STAGE_IDS.ACTIVE_3_TO_6_MONTHS,
  BUYER_AGING.STAGE_IDS.ARCHIVED,
])

const AGING_PRIORITY = { green: 0, amber: 1, red: 2 } as const

export function BuyerColumn({
  stage,
  cards,
  onCardClick,
  isDragSource = false,
  isColumnDragging = false,
  isHidden = false,
}: {
  stage: PipelineStage
  cards: MergedBuyerCard[]
  onCardClick: (propertyEntityIds: number[]) => void
  isDragSource?: boolean
  isColumnDragging?: boolean
  isHidden?: boolean
}) {
  const {
    setNodeRef: setSortableRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: colId(stage.propertyStatusId) })

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: stage.propertyStatusId })

  const label = (stage.propertyStatus ?? stage.propertyStatusCode).toUpperCase()
  const showDropTarget = isOver && !isDragSource

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isHidden ? { display: "none" as const } : {}),
  }

  return (
    <div
      ref={(node) => {
        setSortableRef(node)
        setDropRef(node)
      }}
      style={style}
      className={`flex w-64 shrink-0 flex-col rounded-lg border bg-muted/40 transition-colors ${
        showDropTarget ? "border-primary/50 bg-primary/5" : "border-border"
      } ${isDragging || isColumnDragging ? "opacity-40" : ""}`}
      data-testid={`kanban-column--${stage.propertyStatusCode}`}
    >
      <div
        className="flex cursor-grab items-center justify-between border-b border-border/60 px-3 py-2.5 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
          <GripVertical className="size-3 shrink-0 text-muted-foreground/40" aria-hidden />
          <span data-testid={`kanban-column-label--${stage.propertyStatusCode}`}>{label}</span>
        </span>
        <span data-testid={`kanban-column-count--${stage.propertyStatusCode}`} className="text-xs text-muted-foreground/60">{cards.length}</span>
      </div>
      <div
        className="flex flex-1 flex-col gap-2 p-2"
        aria-label={`${label} column, ${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
      >
        {cards.map((card) => (
          <BuyerKanbanCard
            key={`${card.entityId}-${card.buyerPipelineStatusId}`}
            card={card}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}

export function BuyerKanbanCard({
  card,
  onClick,
  isDragOverlay = false,
}: {
  card: MergedBuyerCard
  onClick: (propertyEntityIds: number[]) => void
  isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: buyerCardId(card.entityId, card.buyerPipelineStatusId),
    disabled: isDragOverlay,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  // Pick the least-urgent (newest) aging color across all properties in this stage
  const agingColor = AGING_STAGE_IDS.has(card.buyerPipelineStatusId as 47 | 55 | 13)
    ? card.properties.reduce<ReturnType<typeof getBuyerAgingColor> | null>((best, p) => {
        if (p.createdAt == null) return best
        const color = getBuyerAgingColor(p.updatedAt, new Date(p.createdAt))
        if (best == null) return color
        return AGING_PRIORITY[color] < AGING_PRIORITY[best] ? color : best
      }, null)
    : null

  const firstProp = card.properties[0]!
  const extraCount = card.properties.length - 1
  const addressLine = extraCount > 0
    ? `${firstProp.streetAddress}, ${firstProp.suburb} +${extraCount} more`
    : `${firstProp.streetAddress}, ${firstProp.suburb}`

  const propertyEntityIds = card.properties.map((p) => p.propertyEntityId)

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      className={`flex cursor-grab flex-col gap-1.5 rounded-md border border-border bg-card px-3 py-2.5 text-sm shadow-xs transition-colors hover:border-border/80 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      } ${isDragOverlay ? "shadow-lg ring-2 ring-primary/30" : ""}`}
      data-testid={`kanban-buyer-card--${card.entityId}-${card.buyerPipelineStatusId}`}
      onClick={() => onClick(propertyEntityIds)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(propertyEntityIds)
        }
      }}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-start gap-1.5">
          <User className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden />
          <span data-testid="buyer-card-entity-name" className="line-clamp-1 font-medium leading-snug text-foreground">
            {card.entityName}
          </span>
        </div>
        {card.totalPropertyCount >= 2 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            ×{card.totalPropertyCount}
          </span>
        )}
      </div>

      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Home className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span data-testid="buyer-card-address" className="line-clamp-2 leading-snug">{addressLine}</span>
      </div>

      {agingColor && (
        <span
          data-testid="buyer-aging-indicator"
          className={cn("size-2 shrink-0 rounded-full", {
            "bg-emerald-500": agingColor === "green",
            "bg-amber-500": agingColor === "amber",
            "bg-red-500": agingColor === "red",
          })}
          aria-label={
            agingColor === "green"
              ? "Active"
              : agingColor === "amber"
                ? "3 to 6 months"
                : "Archived"
          }
        />
      )}
    </div>
  )
}

// ─── Column drag overlay ──────────────────────────────────────────────────────

export function ColumnDragOverlay({ stage }: { stage: PipelineStage }) {
  const label = (stage.propertyStatus ?? stage.propertyStatusCode).toUpperCase()
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg border border-primary/50 bg-muted/40 shadow-lg ring-2 ring-primary/20">
      <div className="flex cursor-grabbing items-center justify-between border-b border-border/60 px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
          <GripVertical className="size-3 shrink-0 text-muted-foreground/40" aria-hidden />
          {label}
        </span>
      </div>
    </div>
  )
}
