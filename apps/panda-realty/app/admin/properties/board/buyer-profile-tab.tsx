"use client"

import { BuyerRequirementsPanel } from "@/components/admin/buyer-requirements-panel"
import type { BuyerDetail } from "./buyer-types"

export function ProfileTab({ detail }: { detail: BuyerDetail }) {
  return (
    <div className="space-y-5">
      {/* Buyer Statuses — read-only */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Buyer Status
        </p>
        {detail.buyerStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No statuses assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {detail.buyerStatuses.map((s) => (
              <span
                key={s.entityBuyerStatusId}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {s.buyerStatus}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Buyer Requirements */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Buyer Requirements
        </p>
        <BuyerRequirementsPanel entityId={detail.entityId} />
      </div>
    </div>
  )
}
