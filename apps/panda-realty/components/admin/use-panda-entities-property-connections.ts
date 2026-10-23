"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { adminEntities } from "@/lib/admin/admin-entities-bundled"

import {
  type PipelineStatusOption,
  fetchPipelineStages,
  patchPropertyEntityBuyerPipelineStage,
} from "./panda-entities-property-connections-pipeline"
import { usePandaEntitiesPropertyConnectionsBuyerOffersPipeline } from "./use-panda-entities-property-connections-buyer-offers-pipeline"
import { usePandaEntitiesPropertyConnectionsList } from "./use-panda-entities-property-connections-list"

export type { SelectValue } from "./use-panda-entities-property-connections-list"

export function usePandaEntitiesPropertyConnections(
  entityRowId: string,
  initialLinkPropertyListId?: string,
) {
  const {
    connections,
    setConnections,
    loadingList,
    listError,
    selectedId,
    selectedDetail,
    setSelectedDetail,
    loadingDetail,
    refetchSelectedPropertyEntityDetail,
    selectValue,
    handleSelectChange,
    handleLinkFavoriteSuccess,
    allFavoritesOptions,
    selectedUnlinkedPropertyListId,
  } = usePandaEntitiesPropertyConnectionsList(entityRowId, initialLinkPropertyListId)

  const [pipelineStages, setPipelineStages] = useState<PipelineStatusOption[]>([])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchPipelineStages().then((stages) => {
      if (mountedRef.current) setPipelineStages(stages)
    })
  }, [])

  const handlePipelineChange = useCallback(
    async (newValue: string) => {
      if (selectedId == null) return
      const newId = newValue === "" ? null : Number(newValue)
      const matchedStage = newId != null ? pipelineStages.find((s) => s.propertyStatusId === newId) : undefined
      const newStatus = matchedStage ? { propertyStatus: matchedStage.propertyStatus } : null
      setSelectedDetail((prev) =>
        prev ? { ...prev, buyerPipelineStatusId: newId, buyerPipelineStatus: newStatus } : prev,
      )
      setConnections((prev) =>
        prev.map((c) =>
          c.propertyEntityId === selectedId
            ? { ...c, buyerPipelineStatusId: newId, buyerPipelineStatus: newStatus }
            : c,
        ),
      )
      try {
        const ok = await patchPropertyEntityBuyerPipelineStage(selectedId, newId)
        if (!ok) await refetchSelectedPropertyEntityDetail()
      } catch {
        await refetchSelectedPropertyEntityDetail()
      }
    },
    [selectedId, pipelineStages, refetchSelectedPropertyEntityDetail, setSelectedDetail, setConnections],
  )

  const { isolatedExtrasForPropertyEntityRef, handleExtrasPayloadSynced } =
    usePandaEntitiesPropertyConnectionsBuyerOffersPipeline({
      selectedDetail,
      selectedId,
      pipelineStages,
      setSelectedDetail,
      setConnections,
      refetchSelectedPropertyEntityDetail,
    })

  const pipelineSelectOptions = useMemo(
    () =>
      pipelineStages.map((s) => ({
        value: String(s.propertyStatusId),
        label: s.propertyStatus,
      })),
    [pipelineStages],
  )

  const pipelineValue =
    selectedDetail?.buyerPipelineStatusId != null
      ? String(selectedDetail.buyerPipelineStatusId)
      : ""

  const propertyEntitiesDef = adminEntities["property-entities"]

  return {
    loadingList,
    listError,
    selectedId,
    selectValue,
    handleSelectChange,
    loadingDetail,
    refetchSelectedPropertyEntityDetail,
    handlePipelineChange,
    isolatedExtrasForPropertyEntityRef,
    handleExtrasPayloadSynced,
    pipelineSelectOptions,
    pipelineValue,
    pipelineStagesLength: pipelineStages.length,
    allFavoritesOptions,
    selectedUnlinkedPropertyListId,
    propertyEntitiesDef,
    selectedDetail,
    handleLinkFavoriteSuccess,
  }
}
