"use client"

import { useContext, useEffect, useState } from "react"

import { AdminClientRegistryContext } from "@repo/admin/admin-client-registry-context"

import { fetchAllBuyerStatuses } from "@/app/admin/properties/board/buyer-status-actions"

type Props = {
  listDetailSeed?: Record<string, unknown>
}

export function PandaEntitiesBuyerStatusTab({ listDetailSeed }: Props) {
  const registry = useContext(AdminClientRegistryContext)
  const [allStatuses, setAllStatuses] = useState<
    Array<{ buyerStatusId: number; buyerStatus: string }>
  >([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    void fetchAllBuyerStatuses().then(setAllStatuses)
  }, [])

  // Seed selection from listDetailSeed and sync to extras ref
  useEffect(() => {
    if (listDetailSeed === undefined) return
    const next = new Set<number>()
    if (Array.isArray(listDetailSeed.entityBuyerStatuses)) {
      for (const item of listDetailSeed.entityBuyerStatuses) {
        const id = (item as Record<string, unknown>).buyerStatusId
        if (typeof id === "number") next.add(id)
      }
    }
    setSelectedIds(next)
    writeToRef(next)
  }, [listDetailSeed]) // eslint-disable-line react-hooks/exhaustive-deps

  function writeToRef(ids: Set<number>) {
    if (registry?.adminEntityCrudExtrasForSaveRef?.current) {
      registry.adminEntityCrudExtrasForSaveRef.current.entityBuyerStatuses =
        Array.from(ids).map((id) => ({ buyerStatusId: id }))
    }
  }

  function handleToggle(buyerStatusId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(buyerStatusId)) {
        next.delete(buyerStatusId)
      } else {
        next.add(buyerStatusId)
      }
      writeToRef(next)
      return next
    })
  }

  if (allStatuses.length === 0) {
    return <p className="text-sm text-muted-foreground">No statuses available.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {allStatuses.map((s) => (
        <label
          key={s.buyerStatusId}
          data-testid={`buyer-status-checkbox--${s.buyerStatusId}`}
          className="flex cursor-pointer items-center gap-2.5 text-sm"
        >
          <input
            type="checkbox"
            checked={selectedIds.has(s.buyerStatusId)}
            onChange={() => handleToggle(s.buyerStatusId)}
            className="size-4 rounded border-border accent-primary"
          />
          {s.buyerStatus}
        </label>
      ))}
    </div>
  )
}
