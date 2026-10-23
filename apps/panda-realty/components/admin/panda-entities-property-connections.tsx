"use client"

import { useState } from "react"

import { useMutation } from "@tanstack/react-query"

import { readApiErrorMessage } from "@repo/admin/read-api-error"
import { Button } from "@repo/ui/button"
import { cn } from "@repo/ui/utils"

import { PandaEntitiesPropertyConnectionsListStatus } from "./panda-entities-property-connections-list-status"
import { PandaEntitiesPropertyConnectionsWorkspace } from "./panda-entities-property-connections-workspace"
import { usePandaEntitiesPropertyConnections } from "./use-panda-entities-property-connections"

export function PandaEntitiesPropertyConnections({
  entityRowId,
  initialLinkPropertyListId,
  isCompact = false,
}: {
  entityRowId: string
  initialLinkPropertyListId?: string
  isCompact?: boolean
}) {
  const {
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
    pipelineStagesLength,
    allFavoritesOptions,
    selectedUnlinkedPropertyListId,
    propertyEntitiesDef,
    selectedDetail,
    handleLinkFavoriteSuccess,
  } = usePandaEntitiesPropertyConnections(entityRowId, initialLinkPropertyListId)

  const [linkError, setLinkError] = useState<string | null>(null)

  const linkMutation = useMutation({
    mutationFn: async (propertyListId: string) => {
      const res = await fetch("/api/admin/property-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entityRowId,
          propertyListId,
          isOriginalOwner: "false",
        }),
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return (await res.json()) as Record<string, unknown>
    },
    onSuccess: async (row) => {
      setLinkError(null)
      await handleLinkFavoriteSuccess(row)
    },
    onError: (e: unknown) => {
      setLinkError(e instanceof Error ? e.message : String(e))
    },
  })

  const linkButton =
    selectedUnlinkedPropertyListId != null ? (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={linkMutation.isPending}
        data-testid="panda-entities-property-connections--link-btn"
        onClick={() => {
          setLinkError(null)
          linkMutation.mutate(String(selectedUnlinkedPropertyListId))
        }}
      >
        {linkMutation.isPending ? "Linking…" : "Link"}
      </Button>
    ) : undefined

  const showWorkspace = selectedId != null || selectedUnlinkedPropertyListId != null

  return (
    <div
      className="flex shrink-0 flex-col border-t"
      data-testid="panda-entities-property-connections"
    >
      <div className={cn(isCompact ? "px-3 py-2" : "px-4 py-3")}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Property Connections
        </p>
      </div>

      <div className={cn(isCompact ? "space-y-3 px-3 pb-2" : "space-y-4 px-4 pb-3")}>
        <PandaEntitiesPropertyConnectionsListStatus
          loadingList={loadingList}
          listError={listError}
          allFavoritesOptions={allFavoritesOptions}
          selectValue={selectValue}
          onSelectValueChange={handleSelectChange}
          linkButton={linkButton}
          isCompact={isCompact}
        />
        {linkError != null && (
          <p className="text-xs text-destructive">{linkError}</p>
        )}
      </div>

      {showWorkspace && (
        <PandaEntitiesPropertyConnectionsWorkspace
          isCompact={isCompact}
          selectedId={selectedId}
          loadingDetail={loadingDetail}
          pipelineValue={pipelineValue}
          pipelineSelectOptions={pipelineSelectOptions}
          pipelineStagesLength={pipelineStagesLength}
          onPipelineChange={handlePipelineChange}
          propertyEntitiesDef={propertyEntitiesDef}
          selectedDetail={selectedDetail}
          onExtrasPayloadSynced={handleExtrasPayloadSynced}
          refetchParentEntityDetail={refetchSelectedPropertyEntityDetail}
          isolatedExtrasForPropertyEntityRef={isolatedExtrasForPropertyEntityRef}
          isUnlinked={selectedUnlinkedPropertyListId != null}
        />
      )}
    </div>
  )
}
