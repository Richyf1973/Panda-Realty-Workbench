"use client"

import { useEffect, useMemo, useState } from "react"

import type { PropertyCard } from "./queries"
import {
  filterPropertyCardsMapByCalendarMonths,
  PANDA_PIPELINE_SELLERS_MONTHS_STORAGE_KEY,
  parseBuyersCalendarMonthsPreset,
  type BuyersCalendarMonthsPreset,
} from "@/lib/buyers-pipeline-calendar-filter"

export function useSellersCalendarMonthFilter(cardsMap: Record<number, PropertyCard[]>) {
  const [monthsPreset, setMonthsPresetState] = useState<BuyersCalendarMonthsPreset>("all")

  useEffect(() => {
    try {
      const parsed = parseBuyersCalendarMonthsPreset(localStorage.getItem(PANDA_PIPELINE_SELLERS_MONTHS_STORAGE_KEY))
      if (parsed != null) setMonthsPresetState(parsed)
    } catch {
      // ignore
    }
  }, [])

  function setMonthsPreset(next: BuyersCalendarMonthsPreset) {
    setMonthsPresetState(next)
    try {
      localStorage.setItem(PANDA_PIPELINE_SELLERS_MONTHS_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const filteredCardsMap = useMemo(
    () => filterPropertyCardsMapByCalendarMonths(cardsMap, monthsPreset),
    [cardsMap, monthsPreset],
  )

  return { monthsPreset, setMonthsPreset, filteredCardsMap }
}
