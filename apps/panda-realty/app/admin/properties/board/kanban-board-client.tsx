"use client"

import React, { useState } from "react"
import {
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
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"

import type { MergedBuyerCard } from "./buyer-pipeline-queries"
import type { PipelineStage, PropertyCard } from "./queries"
import { BuyerDetailPanel } from "./buyer-detail-panel"
import { BuyerDragConfirmDialog } from "./buyer-drag-confirm-dialog"
import { moveBuyerToStage } from "./move-buyer-action"
import { movePropertyToStage, reorderPipelineStages } from "./move-property-action"
import { moveBuyerCardInState, useBuyerDragConfirm } from "./use-buyer-drag"
import { PropertyDetailPanel } from "./property-detail-panel"
import { BuyerColumn, BuyerKanbanCard, ColumnDragOverlay } from "./kanban-buyers-column"
import { KanbanCard, KanbanColumn, cardId, colId } from "./kanban-sellers-column"

type Props = {
  pipeline: "sellers" | "buyers"
  stages: PipelineStage[]
  cardsMap: Record<number, PropertyCard[]>
  buyerCardsMap: Record<number, MergedBuyerCard[]>
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  hideEmptyColumns?: boolean
}

export function KanbanBoardClient({
  pipeline,
  stages,
  cardsMap,
  buyerCardsMap,
  scrollContainerRef,
  hideEmptyColumns = false,
}: Props) {
  // ── Sellers state ──
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cardsState, setCardsState] = useState<Record<number, PropertyCard[]>>(cardsMap)

  // ── Buyers state ──
  const [selectedPropertyEntityIds, setSelectedPropertyEntityIds] = useState<number[] | null>(null)
  const [buyerSheetOpen, setBuyerSheetOpen] = useState(false)
  const [buyerCardsState, setBuyerCardsState] = useState<Record<number, MergedBuyerCard[]>>(buyerCardsMap)

  // ── Buyer drag confirm dialog ──
  const { pendingBuyerMove, buyerDragDialogOpen, onDialogOpenChange, openDragDialog, handleConfirm: handleBuyerDragConfirm } =
    useBuyerDragConfirm(setBuyerCardsState)

  // ── Column order state ──
  const [stagesState, setStagesState] = useState<PipelineStage[]>(stages)

  // ── Shared drag state ──
  const [draggingPropertyCard, setDraggingPropertyCard] = useState<PropertyCard | null>(null)
  const [draggingBuyerCard, setDraggingBuyerCard] = useState<MergedBuyerCard | null>(null)
  const [draggingSourceStatusId, setDraggingSourceStatusId] = useState<number | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<number | null>(null)

  const isCardDragging = draggingPropertyCard !== null || draggingBuyerCard !== null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)

    if (id.startsWith("col-")) {
      setDraggingColumnId(Number(id.slice(4)))
      return
    }

    if (pipeline === "sellers" && id.startsWith("card-")) {
      const numId = Number(id.slice(5))
      for (const [sid, cards] of Object.entries(cardsState)) {
        const card = cards.find((c) => c.propertyListId === numId)
        if (card) { setDraggingPropertyCard(card); setDraggingSourceStatusId(Number(sid)); return }
      }
    } else if (pipeline === "buyers" && id.startsWith("buyer-")) {
      // id format: buyer-{entityId}-{stageId}
      const parts = id.slice(6).split("-")
      const entityId = Number(parts[0])
      const stageId = Number(parts[1])
      for (const [sid, cards] of Object.entries(buyerCardsState)) {
        const card = cards.find((c) => c.entityId === entityId && c.buyerPipelineStatusId === stageId)
        if (card) { setDraggingBuyerCard(card); setDraggingSourceStatusId(Number(sid)); return }
      }
    }
  }

  function handleDragCancel() {
    setDraggingPropertyCard(null)
    setDraggingBuyerCard(null)
    setDraggingSourceStatusId(null)
    setDraggingColumnId(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setDraggingPropertyCard(null)
    setDraggingBuyerCard(null)
    setDraggingSourceStatusId(null)
    setDraggingColumnId(null)

    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Column reorder
    if (activeId.startsWith("col-") && overId.startsWith("col-")) {
      const oldIndex = stagesState.findIndex((s) => colId(s.propertyStatusId) === activeId)
      const newIndex = stagesState.findIndex((s) => colId(s.propertyStatusId) === overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      const reordered = arrayMove(stagesState, oldIndex, newIndex)
      setStagesState(reordered)
      await reorderPipelineStages(reordered.map((s) => s.propertyStatusId))
      return
    }

    const newStatusId = overId.startsWith("col-") ? Number(overId.slice(4)) : Number(over.id)
    if (!Number.isInteger(newStatusId) || newStatusId <= 0) return

    if (pipeline === "sellers" && activeId.startsWith("card-")) {
      const propertyListId = Number(activeId.slice(5))
      let currentStatusId: number | null = null
      for (const [sid, cards] of Object.entries(cardsState)) {
        if (cards.some((c) => c.propertyListId === propertyListId)) { currentStatusId = Number(sid); break }
      }
      if (currentStatusId === null || currentStatusId === newStatusId) return

      setCardsState((prev) => {
        const next: Record<number, PropertyCard[]> = {}
        for (const [sid, cards] of Object.entries(prev)) next[Number(sid)] = [...cards]
        const sourceCards = next[currentStatusId!] ?? []
        const idx = sourceCards.findIndex((c) => c.propertyListId === propertyListId)
        if (idx === -1) return prev
        const [card] = sourceCards.splice(idx, 1)
        next[currentStatusId!] = sourceCards
        next[newStatusId] = [card!, ...(next[newStatusId] ?? [])]
        return next
      })
      await movePropertyToStage(propertyListId, newStatusId)

    } else if (pipeline === "buyers" && activeId.startsWith("buyer-")) {
      const parts = activeId.slice(6).split("-")
      const entityId = Number(parts[0])
      const stageId = Number(parts[1])
      let currentCard: MergedBuyerCard | null = null
      let currentStatusId: number | null = null
      for (const [sid, cards] of Object.entries(buyerCardsState)) {
        const card = cards.find((c) => c.entityId === entityId && c.buyerPipelineStatusId === stageId)
        if (card) { currentCard = card; currentStatusId = Number(sid); break }
      }
      if (!currentCard || currentStatusId === null || currentStatusId === newStatusId) return

      if (currentCard.properties.length === 1) {
        // Single property — move immediately, no dialog
        const propertyEntityId = currentCard.properties[0]!.propertyEntityId
        setBuyerCardsState((prev) => moveBuyerCardInState(prev, currentCard!, currentStatusId!, newStatusId, [propertyEntityId]))
        await moveBuyerToStage(propertyEntityId, newStatusId)
      } else {
        // Multiple properties — show checklist dialog
        openDragDialog(currentCard, newStatusId, currentStatusId)
      }
    }
  }

  const draggingStage = draggingColumnId
    ? stagesState.find((s) => s.propertyStatusId === draggingColumnId)
    : null

  const pendingStageName = pendingBuyerMove
    ? (stagesState.find((s) => s.propertyStatusId === pendingBuyerMove.newStatusId)?.propertyStatus ?? "")
    : ""

  return (
    <>
      <DndContext
        id="kanban-dnd-context"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-w-max gap-3 pb-4">
            {stagesState.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">No pipeline stages found.</p>
            ) : (
              <SortableContext
                items={stagesState.map((s) => colId(s.propertyStatusId))}
                strategy={horizontalListSortingStrategy}
              >
                {pipeline === "sellers"
                  ? stagesState.map((stage) => {
                      const cards = cardsState[stage.propertyStatusId] ?? []
                      return (
                        <KanbanColumn
                          key={stage.propertyStatusId}
                          stage={stage}
                          cards={cards}
                          onCardClick={(id) => { setSelectedPropertyId(id); setSheetOpen(true) }}
                          isDragSource={draggingSourceStatusId === stage.propertyStatusId}
                          isColumnDragging={draggingColumnId === stage.propertyStatusId}
                          isHidden={hideEmptyColumns && cards.length === 0 && !isCardDragging}
                        />
                      )
                    })
                  : stagesState.map((stage) => {
                      const cards = buyerCardsState[stage.propertyStatusId] ?? []
                      return (
                        <BuyerColumn
                          key={stage.propertyStatusId}
                          stage={stage}
                          cards={cards}
                          onCardClick={(ids) => { setSelectedPropertyEntityIds(ids); setBuyerSheetOpen(true) }}
                          isDragSource={draggingSourceStatusId === stage.propertyStatusId}
                          isColumnDragging={draggingColumnId === stage.propertyStatusId}
                          isHidden={hideEmptyColumns && cards.length === 0 && !isCardDragging}
                        />
                      )
                    })}
              </SortableContext>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingPropertyCard && (
            <KanbanCard card={draggingPropertyCard} onClick={() => {}} isDragOverlay />
          )}
          {draggingBuyerCard && (
            <BuyerKanbanCard card={draggingBuyerCard} onClick={() => {}} isDragOverlay />
          )}
          {draggingStage && <ColumnDragOverlay stage={draggingStage} />}
        </DragOverlay>
      </DndContext>

      <PropertyDetailPanel
        propertyId={selectedPropertyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <BuyerDetailPanel
        propertyEntityIds={selectedPropertyEntityIds}
        open={buyerSheetOpen}
        onOpenChange={setBuyerSheetOpen}
      />

      <BuyerDragConfirmDialog
        open={buyerDragDialogOpen}
        onOpenChange={onDialogOpenChange}
        buyerName={pendingBuyerMove?.card.entityName ?? ""}
        stageName={pendingStageName}
        properties={pendingBuyerMove?.card.properties ?? []}
        onConfirm={handleBuyerDragConfirm}
      />
    </>
  )
}

