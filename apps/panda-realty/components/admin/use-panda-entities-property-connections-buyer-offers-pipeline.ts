"use client"

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react"

import { notifyAdminRelatedInlineDraftSync } from "@repo/admin/admin-related-inline-draft-sync"
import { readApiErrorMessage } from "@repo/admin/read-api-error"

import {
  registerEntitiesEditBuyerOffersFollowup,
} from "@/lib/admin/entities-edit-buyer-offers-followup"
import { buyerOffersWorkspaceLinesHavePositiveOffer } from "@/lib/admin/property-entity-buyer-offers-pipeline.shared"

import type { ConnectionSummary } from "./panda-entities-property-connections-data"
import {
  PIPELINE_ADVANCE_DEBOUNCE_MS,
  type PipelineStatusOption,
  findBuyersPipelineStatusId,
  patchPropertyEntityBuyerPipelineStage,
} from "./panda-entities-property-connections-pipeline"

type SetConnections = Dispatch<SetStateAction<ConnectionSummary[]>>

type SetSelectedDetail = Dispatch<SetStateAction<ConnectionSummary | null>>

export function usePandaEntitiesPropertyConnectionsBuyerOffersPipeline({
  selectedDetail,
  selectedId,
  pipelineStages,
  setSelectedDetail,
  setConnections,
  refetchSelectedPropertyEntityDetail,
}: {
  selectedDetail: ConnectionSummary | null
  selectedId: number | null
  pipelineStages: PipelineStatusOption[]
  setSelectedDetail: SetSelectedDetail
  setConnections: SetConnections
  refetchSelectedPropertyEntityDetail: () => Promise<void>
}) {
  const pipelineStagesRef = useRef<PipelineStatusOption[]>([])
  pipelineStagesRef.current = pipelineStages

  const selectedDetailForPipelineRef = useRef<ConnectionSummary | null>(null)
  selectedDetailForPipelineRef.current = selectedDetail

  const pipelineAdvanceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const isolatedExtrasForPropertyEntityRef = useRef<Record<string, unknown>>({})
  const selectedPropertyEntityIdRef = useRef<number | null>(null)
  const refetchPropertyEntityDetailRef = useRef<() => Promise<void>>(async () => {})
  selectedPropertyEntityIdRef.current = selectedId
  refetchPropertyEntityDetailRef.current = refetchSelectedPropertyEntityDetail

  useEffect(() => {
    return () => {
      if (pipelineAdvanceDebounceRef.current) {
        clearTimeout(pipelineAdvanceDebounceRef.current)
        pipelineAdvanceDebounceRef.current = null
      }
    }
  }, [])

  const maybeAutoAdvancePipelineFromOffersDraft = useCallback(async () => {
    const peId = selectedPropertyEntityIdRef.current
    if (peId == null) return
    const extras = isolatedExtrasForPropertyEntityRef.current
    if (!Object.hasOwn(extras, "buyerOffers")) return
    const raw = extras.buyerOffers
    if (!Array.isArray(raw)) return
    const lines: { offer: string }[] = []
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue
      const rec = item as Record<string, unknown>
      const offer = rec.offer
      lines.push({
        offer: typeof offer === "string" ? offer : "",
      })
    }
    if (!buyerOffersWorkspaceLinesHavePositiveOffer(lines)) return

    const stages = pipelineStagesRef.current
    const enquiryId = findBuyersPipelineStatusId(stages, "Enquiry")
    const offerMadeId = findBuyersPipelineStatusId(stages, "Offer Made")
    if (enquiryId == null || offerMadeId == null) return

    const detail = selectedDetailForPipelineRef.current
    const current = detail?.buyerPipelineStatusId ?? null
    if (current != null && current !== enquiryId) return
    if (current === offerMadeId) return

    const matchedStage = stages.find((s) => s.propertyStatusId === offerMadeId)
    const newStatus = matchedStage
      ? { propertyStatus: matchedStage.propertyStatus }
      : { propertyStatus: "Offer Made" }

    setSelectedDetail((prev) =>
      prev && prev.propertyEntityId === peId
        ? {
            ...prev,
            buyerPipelineStatusId: offerMadeId,
            buyerPipelineStatus: newStatus,
          }
        : prev,
    )
    setConnections((prev) =>
      prev.map((c) =>
        c.propertyEntityId === peId
          ? {
              ...c,
              buyerPipelineStatusId: offerMadeId,
              buyerPipelineStatus: newStatus,
            }
          : c,
      ),
    )

    try {
      const ok = await patchPropertyEntityBuyerPipelineStage(peId, offerMadeId)
      if (!ok) await refetchPropertyEntityDetailRef.current()
    } catch {
      await refetchPropertyEntityDetailRef.current()
    }
  }, [setConnections, setSelectedDetail])

  const handleExtrasPayloadSynced = useCallback(() => {
    notifyAdminRelatedInlineDraftSync()
    if (pipelineAdvanceDebounceRef.current) {
      clearTimeout(pipelineAdvanceDebounceRef.current)
    }
    pipelineAdvanceDebounceRef.current = setTimeout(() => {
      pipelineAdvanceDebounceRef.current = null
      void maybeAutoAdvancePipelineFromOffersDraft()
    }, PIPELINE_ADVANCE_DEBOUNCE_MS)
  }, [maybeAutoAdvancePipelineFromOffersDraft])

  useEffect(() => {
    registerEntitiesEditBuyerOffersFollowup(async () => {
      const peId = selectedPropertyEntityIdRef.current
      if (peId == null) return
      const extras = isolatedExtrasForPropertyEntityRef.current
      if (!Object.hasOwn(extras, "buyerOffers")) return
      const buyerOffers = extras.buyerOffers
      const res = await fetch(
        `/api/admin/property-entities/${encodeURIComponent(String(peId))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerOffers }),
        },
      )
      if (!res.ok) {
        const msg = await readApiErrorMessage(res)
        throw new Error(msg)
      }
      await refetchPropertyEntityDetailRef.current()
    })
    return () => {
      registerEntitiesEditBuyerOffersFollowup(null)
    }
  }, [])

  return {
    isolatedExtrasForPropertyEntityRef,
    handleExtrasPayloadSynced,
  }
}
