import Link from "next/link"

import { cn } from "@repo/ui/utils"

import type { MergedBuyerCard } from "./buyer-pipeline-queries"
import type { PipelineStage, PropertyCard } from "./queries"
import { ViewToggle } from "./view-toggle"
import { KanbanBoardClient } from "./kanban-board-client"

type Props = {
  pipeline: "sellers" | "buyers"
  stages: PipelineStage[]
  cardsMap: Record<number, PropertyCard[]>
  buyerCardsMap: Record<number, MergedBuyerCard[]>
}

export function PropertiesBoardShell({ pipeline, stages, cardsMap, buyerCardsMap }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {/* Page header: title + List/Board toggle */}
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="font-heading text-lg font-medium">Properties</h1>
        <ViewToggle activeView="board" pipeline={pipeline} />
      </header>

      {/* Pipeline tab switcher */}
      <PipelineTabs activePipeline={pipeline} />

      {/* Kanban columns — client-rendered for interactivity */}
      <KanbanBoardClient
        pipeline={pipeline}
        stages={stages}
        cardsMap={cardsMap}
        buyerCardsMap={buyerCardsMap}
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
          href={`/admin/properties?pipeline=${p}`}
          role="tab"
          aria-selected={activePipeline === p}
          className={cn(
            "inline-flex h-7 items-center rounded-md px-3 text-sm font-medium capitalize transition-colors",
            activePipeline === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p === "sellers" ? "Sellers" : "Buyers"}
        </Link>
      ))}
    </div>
  )
}
