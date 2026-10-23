"use client"

import { useEffect, useMemo, useState } from "react"

import type { MergedBuyerCard } from "./buyer-pipeline-queries"
import {
  filterBuyerCardsMapByCalendarMonths,
  PANDA_PIPELINE_BUYERS_MONTHS_STORAGE_KEY,
  parseBuyersCalendarMonthsPreset,
  type BuyersCalendarMonthsPreset,
} from "@/lib/buyers-pipeline-calendar-filter"

export function useBuyersCalendarMonthFilter(buyerCardsMap: Record<number, MergedBuyerCard[]>) {
  const [monthsPreset, setMonthsPresetState] = useState<BuyersCalendarMonthsPreset>("all")

  useEffect(() => {
    try {
      const parsed = parseBuyersCalendarMonthsPreset(localStorage.getItem(PANDA_PIPELINE_BUYERS_MONTHS_STORAGE_KEY))
      if (parsed != null) setMonthsPresetState(parsed)
    } catch {
      // ignore
    }
  }, [])

  function setMonthsPreset(next: BuyersCalendarMonthsPreset) {
    setMonthsPresetState(next)
    try {
      localStorage.setItem(PANDA_PIPELINE_BUYERS_MONTHS_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const filteredBuyerCardsMap = useMemo(
    () => filterBuyerCardsMapByCalendarMonths(buyerCardsMap, monthsPreset),
    [buyerCardsMap, monthsPreset],
  )

  return { monthsPreset, setMonthsPreset, filteredBuyerCardsMap }
}
