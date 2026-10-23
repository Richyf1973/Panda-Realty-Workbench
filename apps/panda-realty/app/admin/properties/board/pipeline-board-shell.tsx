"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Label } from "@repo/ui/label"
import { Switch } from "@repo/ui/switch"
import { cn } from "@repo/ui/utils"

import type { MergedBuyerCard } from "./buyer-pipeline-queries"
import type { PipelineStage, PropertyCard } from "./queries"
import { BuyersPipelineMonthSelect } from "./buyers-pipeline-month-select"
import { KanbanBoardClient } from "./kanban-board-client"
import { useBuyersCalendarMonthFilter } from "./use-buyers-calendar-month-filter"
import { useSellersCalendarMonthFilter } from "./use-sellers-calendar-month-filter"

type Props = {
  pipeline: "sellers" | "buyers"
  stages: PipelineStage[]
  cardsMap: Record<number, PropertyCard[]>
  buyerCardsMap: Record<number, MergedBuyerCard[]>
}

const SCROLL_AMOUNT = 268 * 3 // 3 columns (256px wide + 12px gap)

export function PipelineBoardShell({ pipeline, stages, cardsMap, buyerCardsMap }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { monthsPreset, setMonthsPreset, filteredBuyerCardsMap } = useBuyersCalendarMonthFilter(buyerCardsMap)
  const {
    monthsPreset: sellersMonthsPreset,
    setMonthsPreset: setSellersMonthsPreset,
    filteredCardsMap,
  } = useSellersCalendarMonthFilter(cardsMap)

  const storageKey = `panda:pipeline:hideEmptyColumns:${pipeline}`
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "true") {
        setHideEmptyColumns(true)
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey])

  function handleHideEmptyChange(checked: boolean) {
    setHideEmptyColumns(checked)
    try {
      localStorage.setItem(storageKey, String(checked))
    } catch {
      // ignore storage errors
    }
  }

  function scrollLeft() {
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" })
  }

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="font-heading text-lg font-medium">Pipeline</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`hide-empty-${pipeline}`}
              checked={hideEmptyColumns}
              onCheckedChange={handleHideEmptyChange}
              data-testid="pipeline-hide-empty-toggle"
            />
            <Label
              htmlFor={`hide-empty-${pipeline}`}
              className="cursor-pointer select-none text-xs text-muted-foreground"
            >
              Hide empty
            </Label>
          </div>
          <div className="h-4 w-px bg-border" aria-hidden />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={scrollLeft} aria-label="Scroll left" data-testid="pipeline-scroll-left">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={scrollRight} aria-label="Scroll right" data-testid="pipeline-scroll-right">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <PipelineTabs activePipeline={pipeline} />
        {pipeline === "buyers" ? (
          <BuyersPipelineMonthSelect value={monthsPreset} onChange={setMonthsPreset} />
        ) : (
          <BuyersPipelineMonthSelect
            value={sellersMonthsPreset}
            onChange={setSellersMonthsPreset}
            testId="pipeline-sellers-months-filter"
            ariaLabel="Filter properties by last activity (calendar months)"
          />
        )}
      </div>

      <KanbanBoardClient
        key={pipeline === "buyers" ? `buyers-${monthsPreset}` : `sellers-${sellersMonthsPreset}`}
        pipeline={pipeline}
        stages={stages}
        cardsMap={pipeline === "sellers" ? filteredCardsMap : cardsMap}
        buyerCardsMap={pipeline === "buyers" ? filteredBuyerCardsMap : buyerCardsMap}
        scrollContainerRef={scrollRef}
        hideEmptyColumns={hideEmptyColumns}
      />
    </div>
  )
}

function PipelineTabs({
  activePipeline,
}: {
  activePipeline: "sellers" | "buyers"
}) {
  return (
    <div
      className="flex w-fit shrink-0 gap-1 rounded-lg border border-border bg-muted p-1"
      role="tablist"
      aria-label="Pipeline"
    >
      {(["sellers", "buyers"] as const).map((p) => (
        <Link
          key={p}
          href={`/admin/pipeline?pipeline=${p}`}
          role="tab"
          aria-selected={activePipeline === p}
          data-testid={`pipeline-tab--${p}`}
          className={cn(
            "inline-flex h-7 items-center rounded-md px-3 text-sm font-medium capitalize transition-colors",
            activePipeline === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p === "sellers" ? "Properties" : "Buyers"}
        </Link>
      ))}
    </div>
  )
}
