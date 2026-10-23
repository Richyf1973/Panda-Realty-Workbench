"use client"

import { useEffect, useState } from "react"
import { Bell, CalendarClock, ChevronLeft, Mail, Phone } from "lucide-react"

import { Sheet, SheetClose, SheetContent, SheetTitle } from "@repo/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

import { LoadingSkeleton } from "./panel-shared"
import { fetchBuyerDetail } from "./buyer-queries"
import type { BuyerDetail, BuyerPropertyEntry } from "./buyer-types"
import { OverviewTab } from "./buyer-overview-tab"
import { BuyerOffersTab } from "./buyer-offers-tab"
import { ProfileTab } from "./buyer-profile-tab"
import { BuyerNotesTab } from "./buyer-notes-tab"
import { MeetingsTab } from "./property-meetings-tab"

type Props = {
  propertyEntityIds: number[] | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabValue = "overview" | "offers" | "notes" | "profile" | "meetings"

const TABS: { value: TabValue; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "offers", label: "Offers" },
  { value: "notes", label: "Notes" },
  { value: "profile", label: "Profile" },
  { value: "meetings", label: "Meetings" },
]

export function BuyerDetailPanel({ propertyEntityIds, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<BuyerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("overview")
  const [selectedPropertyEntityId, setSelectedPropertyEntityId] = useState<number | null>(null)
  const [offerFormToken, setOfferFormToken] = useState<string | null>(null)
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)

  const idsKey = propertyEntityIds?.join(",") ?? ""

  function refetch(ids: number[]) {
    setLoading(true)
    setError(null)
    fetchBuyerDetail(ids)
      .then((d) => setDetail(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load buyer details"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open || !idsKey) return
    const ids = idsKey.split(",").map(Number)
    setActiveTab("overview")
    setSelectedPropertyEntityId(ids[0] ?? null)
    setOfferFormToken(null)
    refetch(ids)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idsKey])

  useEffect(() => {
    if (activeTab !== "offers" || !selectedPropertyEntityId) return
    setOfferFormToken(null)
    fetch(`/api/admin/property-entities/${selectedPropertyEntityId}/offer-form-status`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { token?: string }
        setOfferFormToken(data.token ?? null)
      })
      .catch(() => {})
  }, [activeTab, selectedPropertyEntityId])

  const selectedProperty: BuyerPropertyEntry | null =
    detail?.properties.find((p) => p.propertyEntityId === selectedPropertyEntityId) ??
    detail?.properties[0] ??
    null

  const currentIds = idsKey ? idsKey.split(",").map(Number) : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0"
        style={{ maxWidth: "42rem" }}
        aria-label="Buyer details"
        data-testid="buyer-detail-panel"
      >
        {/* â”€â”€ Fixed header â”€â”€ */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <SheetClose asChild>
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close panel"
                data-testid="buyer-panel-close-btn"
              >
                <ChevronLeft className="size-4" />
                Back to board
              </button>
            </SheetClose>
            <div className="flex items-center gap-2">
              {detail && (
                <button
                  onClick={() => { setMeetingDialogOpen(true); setActiveTab("meetings") }}
                  className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  aria-label="Add meeting"
                  data-testid="buyer-panel-add-meeting-btn"
                >
                  <CalendarClock className="size-3" />
                  Meeting
                </button>
              )}
              {detail && (
                <button
                  onClick={() => { setReminderDialogOpen(true); setActiveTab("meetings") }}
                  className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  aria-label="Add reminder"
                  data-testid="buyer-panel-add-reminder-btn"
                >
                  <Bell className="size-3" />
                  Reminder
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-2">
            {loading && !detail ? (
              <>
                <SheetTitle className="sr-only">Buyer details</SheetTitle>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </>
            ) : (
              <SheetTitle className="text-base font-semibold leading-snug">
                {detail?.entityName ?? "Buyer details"}
              </SheetTitle>
            )}
          </div>

          {(detail || loading) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 px-4 py-2">
              {loading && !detail ? (
                <>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-28" />
                </>
              ) : detail ? (
                <>
                  {detail.phoneNumber && (
                    <a
                      href={`tel:${detail.phoneNumber}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Phone className="size-3" />
                      {detail.phoneNumber}
                    </a>
                  )}
                  {detail.emailAddress && (
                    <a
                      href={`mailto:${detail.emailAddress}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Mail className="size-3" />
                      {detail.emailAddress}
                    </a>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ── Property selector (multi-property buyers only) ── */}
          {detail && detail.properties.length > 1 && (
            <div className="border-t border-border/50 px-4 py-2">
              <Select
                value={String(selectedPropertyEntityId ?? detail.properties[0]!.propertyEntityId)}
                onValueChange={(val) => setSelectedPropertyEntityId(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs" aria-label="Select property">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {detail.properties.map((p) => (
                    <SelectItem key={p.propertyEntityId} value={String(p.propertyEntityId)}>
                      {p.streetAddress}, {p.suburb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* â”€â”€ Tab bar â”€â”€ */}
        <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-muted/40 px-2 py-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              data-testid={`buyer-panel-tab--${tab.value}`}
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

        {/* â”€â”€ Scrollable content â”€â”€ */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div data-testid="panel-load-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {loading && !detail ? (
            <LoadingSkeleton />
          ) : detail && selectedProperty ? (
            <div data-testid="panel-content-ready">
              {activeTab === "overview" && (
                <OverviewTab
                  property={selectedProperty}
                  onAddMeeting={() => { setMeetingDialogOpen(true); setActiveTab("meetings") }}
                  onOfferCalendarSynced={() => currentIds.length > 0 && refetch(currentIds)}
                />
              )}
              {activeTab === "offers" && (
                <BuyerOffersTab
                  offers={selectedProperty.offers}
                  propertyEntityId={selectedProperty.propertyEntityId}
                  propertyListId={selectedProperty.propertyListId}
                  propertyType={selectedProperty.propertyType}
                  contractDate={selectedProperty.contractDate}
                  offerFormToken={offerFormToken ?? undefined}
                  onConditionsUpdated={() => currentIds.length > 0 && refetch(currentIds)}
                  onOfferAdded={() => currentIds.length > 0 && refetch(currentIds)}
                />
              )}
              {activeTab === "notes" && (
                <BuyerNotesTab
                  notes={selectedProperty.notes}
                  agents={detail.agents}
                  propertyEntityId={selectedProperty.propertyEntityId}
                  onNoteAdded={() => currentIds.length > 0 && refetch(currentIds)}
                />
              )}
              {activeTab === "profile" && (
                <ProfileTab
                  detail={detail}
                />
              )}
              {activeTab === "meetings" && (
                <MeetingsTab
                  meetings={selectedProperty.meetings}
                  propertyListId={selectedProperty.propertyListId}
                  buyers={[{
                    propertyEntityId: selectedProperty.propertyEntityId,
                    entityId: detail.entityId,
                    entityName: detail.entityName,
                    phoneNumber: detail.phoneNumber,
                    emailAddress: detail.emailAddress,
                    memberPropertyToSellAddress: null,
                    memberResidenceAddress: null,
                    offers: selectedProperty.offers,
                  }]}
                  meetingDialogOpen={meetingDialogOpen}
                  reminderDialogOpen={reminderDialogOpen}
                  onMeetingDialogOpenChange={setMeetingDialogOpen}
                  onReminderDialogOpenChange={setReminderDialogOpen}
                  onRefetch={() => currentIds.length > 0 && refetch(currentIds)}
                  defaultMeetingBuyerId={selectedProperty.propertyEntityId}
                />
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
