"use client"

import Link from "next/link"
import { Bell, CalendarClock, ChevronLeft, Trophy, X } from "lucide-react"

import { SheetClose, SheetTitle } from "@repo/ui/sheet"
import { Skeleton } from "@repo/ui/skeleton"
import { cn } from "@repo/ui/utils"

import { DataPill, formatAUD, formatDate } from "./panel-shared"
import type { PropertyDetailProperty } from "./property-types"

export type PropertyDetailPanelHeaderProps = {
  loading: boolean
  hasDetail: boolean
  prop: PropertyDetailProperty | null
  fullAddress: string | null
  toggling: boolean
  commissionDisplay: string | null
  onAddMeeting: () => void
  onAddReminder: () => void
  onToggleWon: () => void
  onToggleLost: () => void
}

export function PropertyDetailPanelHeader({
  loading,
  hasDetail,
  prop,
  fullAddress,
  toggling,
  commissionDisplay,
  onAddMeeting,
  onAddReminder,
  onToggleWon,
  onToggleLost,
}: PropertyDetailPanelHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <SheetClose asChild>
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close panel"
            data-testid="property-panel-close-btn"
          >
            <ChevronLeft className="size-4" />
            Back to board
          </button>
        </SheetClose>
        <div className="flex items-center gap-2">
          {prop && (
            <button
              type="button"
              onClick={onAddMeeting}
              className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
              aria-label="Add meeting"
              data-testid="property-panel-add-meeting-btn"
            >
              <CalendarClock className="size-3" />
              Meeting
            </button>
          )}
          {prop && (
            <button
              type="button"
              onClick={onAddReminder}
              className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
              aria-label="Add reminder"
              data-testid="property-panel-add-reminder-btn"
            >
              <Bell className="size-3" />
              Reminder
            </button>
          )}
          {prop && (
            <button
              type="button"
              onClick={() => void onToggleWon()}
              disabled={toggling}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                prop.isWon
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              aria-pressed={prop.isWon}
              aria-label={prop.isWon ? "Mark as not won" : "Mark as won"}
              data-testid="property-panel-won-btn"
            >
              <Trophy className="size-3" />
              Won
            </button>
          )}
          {prop && (
            <button
              type="button"
              onClick={() => void onToggleLost()}
              disabled={toggling}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                prop.isLost
                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              aria-pressed={prop.isLost}
              aria-label={prop.isLost ? "Mark as not lost" : "Mark as lost"}
              data-testid="property-panel-lost-btn"
            >
              <X className="size-3" />
              Lost
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        {loading && !hasDetail ? (
          <>
            <SheetTitle className="sr-only">Property details</SheetTitle>
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </>
        ) : (
          <>
            {prop && fullAddress ? (
              <SheetTitle asChild>
                <Link
                  href={`/admin/properties?openEdit=${prop.propertyListId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "text-base font-semibold leading-snug text-foreground",
                    "underline-offset-4 hover:underline",
                    "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Open property record for editing: ${fullAddress}`}
                  data-testid="property-detail-panel-address-open-edit"
                >
                  {fullAddress}
                </Link>
              </SheetTitle>
            ) : (
              <SheetTitle className="text-base font-semibold leading-snug">
                {fullAddress ?? "Property details"}
              </SheetTitle>
            )}
            {prop && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {prop.propertyType}
                {prop.stageName ? ` · ${prop.stageName}` : ""}
              </p>
            )}
          </>
        )}
      </div>

      {(prop || loading) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 px-4 py-2.5">
          {loading && !prop ? (
            <>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : prop ? (
            <>
              {formatAUD(prop.appraisedAmount) && (
                <DataPill label="Appraised" value={formatAUD(prop.appraisedAmount)!} />
              )}
              {commissionDisplay !== null && (
                <span data-testid="property-panel-commission-badge">
                  <DataPill label="Commission" value={commissionDisplay} />
                </span>
              )}
              <DataPill label="Added" value={formatDate(prop.createdAt)} />
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
