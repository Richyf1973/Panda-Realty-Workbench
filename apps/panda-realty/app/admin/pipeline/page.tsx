import type { Metadata } from "next"

import { PipelineBoardShell } from "../properties/board/pipeline-board-shell"
import { applyBuyerAgingRules } from "../properties/board/buyer-aging-rules"
import { fetchBuyerCardsForPipeline, type MergedBuyerCard } from "../properties/board/buyer-pipeline-queries"
import { fetchFavoritePropertiesForPipeline, fetchPipelineStages, type PropertyCard } from "../properties/board/queries"

export const metadata: Metadata = {
  title: "Pipeline · Admin",
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PipelinePage({ searchParams }: PageProps) {
  const sp = await searchParams

  const rawPipeline = Array.isArray(sp.pipeline) ? sp.pipeline[0] : sp.pipeline
  const pipeline = rawPipeline === "buyers" ? "buyers" : "sellers"

  if (pipeline === "buyers") {
    await applyBuyerAgingRules()
  }

  const [stages, cardsMap, buyerCardsMap] = await Promise.all([
    fetchPipelineStages(pipeline),
    fetchFavoritePropertiesForPipeline(pipeline),
    pipeline === "buyers"
      ? fetchBuyerCardsForPipeline()
      : Promise.resolve(new Map<number, MergedBuyerCard[]>()),
  ])

  return (
    <PipelineBoardShell
      pipeline={pipeline}
      stages={stages}
      cardsMap={Object.fromEntries(cardsMap) as Record<number, PropertyCard[]>}
      buyerCardsMap={Object.fromEntries(buyerCardsMap) as Record<number, MergedBuyerCard[]>}
    />
  )
}
