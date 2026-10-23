"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { cn } from "@repo/ui/utils"

import type { DealStage } from "./property-types"

export function DealStepperSection({
  stages,
  currentStageId,
  hasAcceptedOffer,
  onStageClick,
}: {
  stages: DealStage[]
  currentStageId: number | null
  hasAcceptedOffer: boolean
  onStageClick: (statusId: number) => void
}) {
  const [advancing, setAdvancing] = useState<number | null>(null)

  const currentIdx = stages.findIndex((s) => s.propertyStatusId === currentStageId)

  async function handleClick(stage: DealStage) {
    if (advancing !== null) return
    setAdvancing(stage.propertyStatusId)
    await onStageClick(stage.propertyStatusId)
    setAdvancing(null)
  }

  return (
    <>
      <div className="my-4 border-t border-border" />
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Deal Pipeline
      </p>
      {!hasAcceptedOffer ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          No accepted offer yet. Deal pipeline becomes active once an offer is accepted.
        </p>
      ) : stages.length === 0 ? (
        <p className="text-xs text-muted-foreground">No deal stages configured.</p>
      ) : (
        <div className="relative">
          <div className="absolute top-4 left-4 right-4 h-px bg-border" aria-hidden />
          <ol className="relative flex items-start justify-between gap-1">
            {stages.map((stage, idx) => {
              const isCompleted = currentIdx >= 0 && idx < currentIdx
              const isCurrent = stage.propertyStatusId === currentStageId
              const isClickable = advancing === null

              return (
                <li key={stage.propertyStatusId} className="flex flex-1 flex-col items-center gap-1.5">
                  <button
                    onClick={() => void handleClick(stage)}
                    disabled={!isClickable}
                    aria-label={`Set deal stage to ${stage.stageName}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      advancing === stage.propertyStatusId && "animate-pulse",
                    )}
                  >
                    {isCompleted ? <Check className="size-3.5" /> : <span>{idx + 1}</span>}
                  </button>
                  <span
                    className={cn(
                      "text-center text-[10px] leading-tight",
                      isCurrent
                        ? "font-semibold text-foreground"
                        : isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {stage.stageName}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </>
  )
}
