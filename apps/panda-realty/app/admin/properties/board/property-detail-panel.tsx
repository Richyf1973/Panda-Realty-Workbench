"use client"

import { useEffect, useState } from "react"

import { Sheet, SheetContent } from "@repo/ui/sheet"
import { cn } from "@repo/ui/utils"

import { moveDealToStage } from "./move-deal-stage-action"
import { togglePropertyLost, togglePropertyWon } from "./toggle-won-lost-action"
import { formatAUD, LoadingSkeleton } from "./panel-shared"
import { fetchPropertyDetail } from "./property-queries"
import type { PropertyDetail } from "./property-types"
import { PropertyDetailPanelHeader } from "./property-detail-panel-header"
import { SummaryTab } from "./property-summary-tab"
import { PropertyNotesTab } from "./property-notes-tab"
import { BuyersTab, ContactsTab, FilesTab, OffersTab } from "./property-panel-tabs"
import { MeetingsTab } from "./property-meetings-tab"

type Props = {
  propertyId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabValue = "summary" | "buyers" | "contacts" | "notes" | "files" | "offers" | "meetings"

const TABS: { value: TabValue; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "buyers", label: "Buyers" },
  { value: "contacts", label: "Contacts" },
  { value: "notes", label: "Notes" },
  { value: "files", label: "Files" },
  { value: "offers", label: "Offers" },
  { value: "meetings", label: "Meetings" },
]

export function PropertyDetailPanel({ propertyId, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("summary")
  const [toggling, setToggling] = useState(false)
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)

  async function handleToggleWon() {
    if (!prop || toggling) return
    setToggling(true)
    await togglePropertyWon(prop.propertyListId, prop.isWon)
    if (propertyId != null) refetch(propertyId)
    setToggling(false)
  }

  async function handleToggleLost() {
    if (!prop || toggling) return
    setToggling(true)
    await togglePropertyLost(prop.propertyListId, prop.isLost)
    if (propertyId != null) refetch(propertyId)
    setToggling(false)
  }

  async function handleDealStageChange(propId: number, statusId: number) {
    await moveDealToStage(propId, statusId)
    refetch(propId)
  }

  function refetch(id: number) {
    setLoading(true)
    setError(null)
    fetchPropertyDetail(id)
      .then((d) => setDetail(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load property details"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open || propertyId == null) return
    setActiveTab("summary")
    setDetail(null)
    refetch(propertyId)
  }, [open, propertyId])

  const prop = detail?.property ?? null
  const fullAddress = prop
    ? `${prop.streetAddress}, ${prop.suburb} ${prop.state} ${prop.postcode}`
    : null

  const acceptedOfferAmount = detail?.buyers
    .flatMap((b) => b.offers)
    .find((o) => o.isAccepted)?.offer ?? null

  const commissionDisplay: string | null = prop?.commissionRate
    ? acceptedOfferAmount
      ? formatAUD(
          String((parseFloat(acceptedOfferAmount) * parseFloat(prop.commissionRate)) / 100),
        )
      : "No offer yet"
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0"
        style={{ maxWidth: "42rem" }}
        aria-label="Property details"
        data-testid="property-detail-panel"
      >
        <PropertyDetailPanelHeader
          loading={loading}
          hasDetail={detail != null}
          prop={prop}
          fullAddress={fullAddress}
          toggling={toggling}
          commissionDisplay={commissionDisplay}
          onAddMeeting={() => {
            setMeetingDialogOpen(true)
            setActiveTab("meetings")
          }}
          onAddReminder={() => {
            setReminderDialogOpen(true)
            setActiveTab("meetings")
          }}
          onToggleWon={handleToggleWon}
          onToggleLost={handleToggleLost}
        />

        {/* ── Tab bar ── */}
        <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-muted/40 px-2 py-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              data-testid={`property-panel-tab--${tab.value}`}
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

        {/* ── Scrollable content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div data-testid="panel-load-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {loading && !detail ? (
            <LoadingSkeleton />
          ) : detail ? (
            <div data-testid="panel-content-ready">
              {activeTab === "summary" && (
                <SummaryTab
                  property={detail.property}
                  buyers={detail.buyers}
                  dealStages={detail.dealStages}
                  onDealStageChange={(statusId) => {
                    if (detail.property) void handleDealStageChange(detail.property.propertyListId, statusId)
                  }}
                  onConditionsSaved={() => propertyId != null && refetch(propertyId)}
                  onMeetingAdded={() => propertyId != null && refetch(propertyId)}
                />
              )}
              {activeTab === "buyers" && <BuyersTab buyers={detail.buyers} />}
              {activeTab === "contacts" && <ContactsTab contacts={detail.contacts} />}
              {activeTab === "notes" && (
                <PropertyNotesTab
                  notes={detail.notes}
                  propertyListId={detail.property?.propertyListId ?? null}
                  onNoteAdded={() => propertyId != null && refetch(propertyId)}
                  agents={detail.agents}
                  buyers={detail.buyers}
                />
              )}
              {activeTab === "files" && <FilesTab files={detail.files} />}
              {activeTab === "offers" && <OffersTab offers={detail.offers} />}
              {activeTab === "meetings" && detail.property && (
                <MeetingsTab
                  meetings={detail.meetings}
                  propertyListId={detail.property.propertyListId}
                  buyers={detail.buyers}
                  meetingDialogOpen={meetingDialogOpen}
                  reminderDialogOpen={reminderDialogOpen}
                  onMeetingDialogOpenChange={setMeetingDialogOpen}
                  onReminderDialogOpenChange={setReminderDialogOpen}
                  onRefetch={() => propertyId != null && refetch(propertyId)}
                />
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
