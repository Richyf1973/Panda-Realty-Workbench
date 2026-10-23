"use client"

import { useState } from "react"

import { cn } from "@repo/ui/utils"

import { BuyerRequirementsPanel } from "./buyer-requirements-panel"
import { PandaEntitiesBuyerStatusTab } from "./panda-entities-buyer-status-tab"
import { PropertyEntityBuyerMembersPanel } from "./property-entity-buyer-members-panel"

type TabValue = "members" | "requirements" | "status"

const TABS: { value: TabValue; label: string }[] = [
  { value: "members", label: "Members" },
  { value: "requirements", label: "Requirements" },
  { value: "status", label: "Status" },
]

type Props = {
  entityId: number
  isCompact: boolean
  entityName: string
  listDetailSeed?: Record<string, unknown>
}

export function PandaEntitiesBuyerTabs({ entityId, isCompact, entityName, listDetailSeed }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>("members")

  return (
    <div
      className={cn("flex shrink-0 flex-col border-t", isCompact ? "mt-3" : "mt-4")}
      data-testid="panda-entities-buyer-tabs"
    >
      {/* Tab bar */}
      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-muted/40 px-2 py-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            data-testid={`panda-entities-buyer-tab--${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              activeTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={cn(isCompact ? "p-3" : "p-4")}>
        {activeTab === "members" && (
          <>
            <p className={cn("text-xs text-muted-foreground", isCompact ? "mb-1.5" : "mb-2")}>
              One member may be marked as the buyer&apos;s representative.
            </p>
            <PropertyEntityBuyerMembersPanel
              entityId={entityId}
              variant="edit"
              membersPanelSource="entities"
              entityName={entityName}
            />
          </>
        )}

        {activeTab === "requirements" && (
          <BuyerRequirementsPanel entityId={entityId} />
        )}

        {activeTab === "status" && (
          <PandaEntitiesBuyerStatusTab listDetailSeed={listDetailSeed} />
        )}
      </div>
    </div>
  )
}
