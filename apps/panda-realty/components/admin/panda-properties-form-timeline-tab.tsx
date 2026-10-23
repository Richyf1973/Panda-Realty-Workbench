"use client"

/**
 * Timeline tab in the property window: the Property Sale Timeline for this property,
 * embedded from /sale-timeline-app (which fills in the address and owners and keeps
 * the sale saved under "property-<id>").
 */
export function PandaPropertiesFormTimelineTab({ propertyListId }: { propertyListId: string | null }) {
  if (!propertyListId) {
    return (
      <p className="px-4 pb-4 text-sm text-muted-foreground" data-testid="panda-properties-timeline-save-first">
        Save the property first, then its sale timeline appears here.
      </p>
    )
  }
  return (
    <div className="flex flex-col px-4 pb-4" data-testid="panda-properties-timeline-tab">
      <div className="mb-2 flex justify-end">
        <a
          href={`/admin/sale-timeline?propertyListId=${encodeURIComponent(propertyListId)}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Open full screen ↗
        </a>
      </div>
      <iframe
        title="Property sale timeline"
        src={`/sale-timeline-app?property=${encodeURIComponent(propertyListId)}`}
        className="w-full rounded-md border"
        style={{ height: "75vh", minHeight: 520 }}
      />
    </div>
  )
}
