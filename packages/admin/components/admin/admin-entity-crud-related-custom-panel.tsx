"use client"

import { useAdminClientRegistry } from "../../admin-client-registry-context"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type {
  AdminEntityCrudRelatedCollectionCustom,
} from "../../admin-entity-types"

export function AdminEntityCrudRelatedCustomPanel({
  parentSlug,
  collection,
  variant,
  entityRowId,
  detailPayload,
  detailPending,
  detailError,
}: {
  parentSlug: AdminEntitySlug
  collection: AdminEntityCrudRelatedCollectionCustom
  variant: "create" | "edit"
  entityRowId: string | null
  detailPayload: Record<string, unknown> | undefined
  detailPending: boolean
  detailError: string | null
}) {
  const { renderCrudRelatedCustomPanel } = useAdminClientRegistry()
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
      data-testid={`admin-entity-crud-related-custom--${parentSlug}--${collection.customRelatedPanelKey}`}
    >
      {renderCrudRelatedCustomPanel?.({
        parentSlug,
        variant,
        entityRowId,
        customRelatedPanelKey: collection.customRelatedPanelKey,
        detailPayload,
        detailPending,
        detailError,
      }) ?? (
        <p className="text-muted-foreground text-sm">
          This tab has no renderer (missing{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            renderCrudRelatedCustomPanel
          </code>{" "}
          for{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {collection.customRelatedPanelKey}
          </code>
          ).
        </p>
      )}
    </div>
  )
}
