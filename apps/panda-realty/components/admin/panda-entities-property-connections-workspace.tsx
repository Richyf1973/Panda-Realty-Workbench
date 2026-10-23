"use client"

import type { MutableRefObject } from "react"

import { AdminEntityCrudRelatedCollectionsSection } from "@repo/admin/components/admin/admin-entity-crud-related-collections"
import { AdminEntityCrudListRelationSelectControl } from "@repo/admin/components/admin/admin-entity-crud-list-relation-select-control"
import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"

import type { ConnectionSummary } from "./panda-entities-property-connections-data"
import { IsolatedRegistryWrapper } from "./panda-entities-property-connections-isolated-registry"

type PipelineOption = { value: string; label: string }

export function PandaEntitiesPropertyConnectionsWorkspace({
  isCompact = false,
  selectedId,
  loadingDetail,
  pipelineValue,
  pipelineSelectOptions,
  pipelineStagesLength,
  onPipelineChange,
  propertyEntitiesDef,
  selectedDetail,
  onExtrasPayloadSynced,
  refetchParentEntityDetail,
  isolatedExtrasForPropertyEntityRef,
  isUnlinked = false,
}: {
  isCompact?: boolean
  selectedId: number | null
  loadingDetail: boolean
  pipelineValue: string
  pipelineSelectOptions: PipelineOption[]
  pipelineStagesLength: number
  onPipelineChange: (value: string) => void
  propertyEntitiesDef: AdminEntityDefinition
  selectedDetail: ConnectionSummary | null
  onExtrasPayloadSynced: () => void
  refetchParentEntityDetail: () => Promise<void>
  isolatedExtrasForPropertyEntityRef: MutableRefObject<Record<string, unknown>>
  /** When true, renders a placeholder instead of the pipeline/offers workspace. */
  isUnlinked?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col border-t",
        loadingDetail && !isUnlinked && "opacity-60",
      )}
      data-testid="panda-entities-property-connections--workspace"
    >
      {isUnlinked ? (
        <p className={cn("text-sm text-muted-foreground", isCompact ? "px-3 py-2" : "px-4 py-3")}>
          Link the buyer to this property first.
        </p>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center",
              isCompact ? "gap-2 px-3 py-1.5" : "gap-3 px-4 py-2",
            )}
          >
            <Label
              htmlFor="panda-entities-pe-pipeline"
              className="shrink-0 text-xs font-normal text-muted-foreground"
            >
              Pipeline stage
            </Label>
            <div className="w-44">
              <AdminEntityCrudListRelationSelectControl
                htmlForId="panda-entities-pe-pipeline"
                data-testid="panda-entities-property-connections--pipeline-select"
                ariaLabel="Pipeline stage"
                required={false}
                value={pipelineValue}
                onChange={(v) => {
                  void onPipelineChange(v)
                }}
                onBlur={() => undefined}
                emptyChoiceLabel="Not on pipeline"
                baseOptions={pipelineSelectOptions}
                optionsPending={pipelineStagesLength === 0}
              />
            </div>
          </div>

          {selectedId != null && (
            <IsolatedRegistryWrapper extrasRef={isolatedExtrasForPropertyEntityRef}>
              <AdminEntityCrudRelatedCollectionsSection
                slug="property-entities"
                entityDefinition={propertyEntitiesDef}
                variant="edit"
                entityRowId={String(selectedId)}
                listDetailSeed={selectedDetail ?? undefined}
                onExtrasPayloadSynced={onExtrasPayloadSynced}
                refetchParentEntityDetail={refetchParentEntityDetail}
              />
            </IsolatedRegistryWrapper>
          )}
        </>
      )}
    </div>
  )
}
