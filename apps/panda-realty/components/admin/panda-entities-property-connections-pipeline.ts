/**
 * Buyers-pipeline stage options + PATCH for `property_entities.buyer_pipeline_status_id`.
 */

export type PipelineStatusOption = {
  propertyStatusId: number
  propertyStatus: string
  pipeline?: string | null
  propertyStatusCode?: string | null
}

/** Debounce after related-table extras sync before PATCHing pipeline (avoids request storms on each keystroke). */
export const PIPELINE_ADVANCE_DEBOUNCE_MS = 400

function filterPipelineStagesForBuyers(
  items: PipelineStatusOption[],
): PipelineStatusOption[] {
  return items.filter((s) => s.pipeline === "buyers")
}

/** Stages are filtered to buyers pipeline only; resolve by stable code then label. */
export function findBuyersPipelineStatusId(
  stages: PipelineStatusOption[],
  code: "Enquiry" | "Offer Made",
): number | null {
  return (
    stages.find((s) => s.propertyStatusCode === code)?.propertyStatusId ??
    stages.find((s) => s.propertyStatus === code)?.propertyStatusId ??
    null
  )
}

export async function fetchPipelineStages(): Promise<PipelineStatusOption[]> {
  const res = await fetch(`/api/admin/property-status?limit=100`, { cache: "no-store" })
  if (!res.ok) return []
  const data = (await res.json()) as { items?: PipelineStatusOption[] }
  return filterPipelineStagesForBuyers(data.items ?? [])
}

/**
 * PATCH `buyer_pipeline_status_id` only. Returns whether the server responded 2xx
 * (caller should refetch detail on false or thrown network error).
 */
export async function patchPropertyEntityBuyerPipelineStage(
  propertyEntityId: number,
  buyerPipelineStatusId: number | null,
): Promise<boolean> {
  const res = await fetch(`/api/admin/property-entities/${propertyEntityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerPipelineStatusId:
        buyerPipelineStatusId != null ? String(buyerPipelineStatusId) : "",
    }),
  })
  return res.ok
}
