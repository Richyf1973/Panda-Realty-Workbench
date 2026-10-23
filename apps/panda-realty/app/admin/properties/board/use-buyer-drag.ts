"use client"

import { useState } from "react"

import type { MergedBuyerCard } from "./buyer-pipeline-queries"
import { moveBuyerToStage } from "./move-buyer-action"

type PendingBuyerMove = {
  card: MergedBuyerCard
  newStatusId: number
  currentStatusId: number
}

export type { PendingBuyerMove }

export function moveBuyerCardInState(
  prev: Record<number, MergedBuyerCard[]>,
  card: MergedBuyerCard,
  currentStatusId: number,
  newStatusId: number,
  selectedIds: number[],
): Record<number, MergedBuyerCard[]> {
  const next: Record<number, MergedBuyerCard[]> = {}
  for (const [sid, cards] of Object.entries(prev)) next[Number(sid)] = [...cards]

  const sourceCards = next[currentStatusId] ?? []
  const idx = sourceCards.findIndex(
    (c) => c.entityId === card.entityId && c.buyerPipelineStatusId === card.buyerPipelineStatusId,
  )
  if (idx === -1) return prev
  sourceCards.splice(idx, 1)
  next[currentStatusId] = sourceCards

  const stayingProps = card.properties.filter((p) => !selectedIds.includes(p.propertyEntityId))
  if (stayingProps.length > 0) {
    next[currentStatusId] = [{ ...card, properties: stayingProps }, ...(next[currentStatusId] ?? [])]
  }

  const movingProps = card.properties.filter((p) => selectedIds.includes(p.propertyEntityId))
  const destCards = next[newStatusId] ?? []
  const existingDestIdx = destCards.findIndex((c) => c.entityId === card.entityId)
  if (existingDestIdx !== -1) {
    destCards[existingDestIdx] = {
      ...destCards[existingDestIdx]!,
      properties: [...movingProps, ...destCards[existingDestIdx]!.properties],
    }
  } else {
    next[newStatusId] = [{ ...card, buyerPipelineStatusId: newStatusId, properties: movingProps }, ...destCards]
  }

  return next
}

export function useBuyerDragConfirm(
  setBuyerCardsState: React.Dispatch<React.SetStateAction<Record<number, MergedBuyerCard[]>>>,
) {
  const [pendingBuyerMove, setPendingBuyerMove] = useState<PendingBuyerMove | null>(null)
  const [buyerDragDialogOpen, setBuyerDragDialogOpen] = useState(false)

  function openDragDialog(card: MergedBuyerCard, newStatusId: number, currentStatusId: number) {
    setPendingBuyerMove({ card, newStatusId, currentStatusId })
    setBuyerDragDialogOpen(true)
  }

  async function handleConfirm(selectedIds: number[]) {
    setBuyerDragDialogOpen(false)
    if (!pendingBuyerMove || selectedIds.length === 0) { setPendingBuyerMove(null); return }
    const { card, newStatusId, currentStatusId } = pendingBuyerMove
    setPendingBuyerMove(null)
    setBuyerCardsState((prev) => moveBuyerCardInState(prev, card, currentStatusId, newStatusId, selectedIds))
    await Promise.all(selectedIds.map((id) => moveBuyerToStage(id, newStatusId)))
  }

  function onDialogOpenChange(open: boolean) {
    if (!open) setPendingBuyerMove(null)
    setBuyerDragDialogOpen(open)
  }

  return { pendingBuyerMove, buyerDragDialogOpen, onDialogOpenChange, openDragDialog, handleConfirm }
}
