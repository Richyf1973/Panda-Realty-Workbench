"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, GripVertical, Star } from "lucide-react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { formatAdminEntityNumericListCell } from "@repo/admin/admin-entity-list-numeric-format"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import { clearDueHighlight } from "./clear-due-highlight-action"
import type { PipelineStage, PropertyCard } from "./queries"

export function colId(statusId: number) {
  return `col-${statusId}`
}

export function cardId(propertyListId: number) {
  return `card-${propertyListId}`
}


export function KanbanColumn({
  stage,
  cards,
  onCardClick,
  isDragSource = false,
  isColumnDragging = false,
  isHidden = false,
}: {
  stage: PipelineStage
  cards: PropertyCard[]
  onCardClick: (propertyListId: number) => void
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
          <KanbanCard key={card.propertyListId} card={card} onClick={onCardClick} />
        ))}
      </div>
    </div>
  )
}

export function KanbanCard({
  card,
  onClick,
  isDragOverlay = false,
}: {
  card: PropertyCard
  onClick: (propertyListId: number) => void
  isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cardId(card.propertyListId),
    disabled: isDragOverlay,
  })
  const router = useRouter()
  const [clearing, startClearing] = useTransition()

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const acceptedOffer = (() => {
    for (const buyer of card.buyers) {
      const acc = buyer.offers.find((o) => o.isAccepted)
      if (acc) return acc
    }
    return null
  })()

  const rawPrice = acceptedOffer?.offer ?? card.appraisedAmount
  const displayPrice = rawPrice
    ? formatAdminEntityNumericListCell(rawPrice, { currencySymbol: "$" })
    : null
  const priceTooltip = acceptedOffer
    ? "Showing contract price — offer accepted"
    : "Showing appraised price — no accepted offer yet"

  const isRecent =
    card.updatedAt != null &&
    Date.now() - card.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000

  const fullAddress = `${card.streetAddress}, ${card.suburb}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      className={`flex cursor-grab flex-col gap-1.5 rounded-md border px-3 py-2.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing ${
        card.dueHighlightActive
          ? "border-green-600/40 bg-green-100 hover:bg-green-100/80 dark:bg-green-950/40 dark:hover:bg-green-950/60"
          : card.dueWarningActive
            ? card.dueWarningTier === "soon"
              ? "border-red-600/40 bg-red-100 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-950/60"
              : "border-amber-600/40 bg-amber-100 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
            : "border-border bg-card hover:border-border/80 hover:bg-card/80"
      } ${isDragging ? "opacity-30" : ""} ${isDragOverlay ? "shadow-lg ring-2 ring-primary/30" : ""}`}
      data-testid={`kanban-card--${card.propertyListId}`}
      data-due-highlight={card.dueHighlightActive ? "true" : undefined}
      data-due-warning={card.dueWarningActive ? "true" : undefined}
      onClick={() => onClick(card.propertyListId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(card.propertyListId)
        }
      }}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
    >
      <div className="flex items-start gap-1.5">
        <Star className="mt-0.5 size-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
        <span className="line-clamp-2 font-medium leading-snug text-foreground">
          {fullAddress}
        </span>
        {card.dueHighlightActive && !isDragOverlay && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Clear due highlight"
                data-testid={`property-due-highlight-clear--${card.propertyListId}`}
                className="ml-auto shrink-0 rounded p-0.5 text-green-700 hover:bg-green-200/60 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/40"
                disabled={clearing}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  startClearing(async () => {
                    await clearDueHighlight(card.propertyListId)
                    router.refresh()
                  })
                }}
              >
                <CircleCheck className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {card.dueHighlightLabels.length > 0
                ? `${card.dueHighlightLabels[0]}, due today. Click to clear.`
                : "Clear due highlight"}
            </TooltipContent>
          </Tooltip>
        )}
        {card.dueWarningActive && !card.dueHighlightActive && !isDragOverlay && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`ml-auto shrink-0 rounded p-0.5 outline-none ${
                  card.dueWarningTier === "soon"
                    ? "text-red-500 focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400"
                    : "text-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400"
                }`}
                data-testid={`property-due-warning--${card.propertyListId}`}
                data-due-warning-tier={card.dueWarningTier ?? "upcoming"}
                tabIndex={0}
                aria-label={card.dueWarningLabels[0] ?? "Due soon"}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CircleCheck className="size-3.5" aria-hidden />
              </span>
            </TooltipTrigger>
            <TooltipContent>{card.dueWarningLabels[0] ?? "Due soon"}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {displayPrice && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-fit text-xs font-medium text-foreground/80" data-testid="kanban-card-price">
              {displayPrice}
            </span>
          </TooltipTrigger>
          <TooltipContent>{priceTooltip}</TooltipContent>
        </Tooltip>
      )}

      {acceptedOffer != null && (
        <span
          className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
          data-testid={`kanban-card-buyer-offer-accepted--${acceptedOffer.buyerOfferId}`}
        >
          Offer accepted
        </span>
      )}

      {isRecent && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-label="Recent activity" />
          <span>Recent activity</span>
        </div>
      )}
    </div>
  )
}
