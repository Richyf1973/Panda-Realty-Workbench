"use client"

import { useState } from "react"
import { Map } from "lucide-react"
import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import { usePropertyMapFilterOpen } from "@/components/admin/property-map-filter-context"
import type { DueWarningTier } from "@/lib/admin/due-highlight"

import { PropertyListAddNoteDialog } from "./property-list-add-note-dialog"
import { PropertyListRowHideFromViewCheckbox } from "./property-list-row-hide-from-view-checkbox"
import { PropertyListRowEmailDialogs } from "./property-list-row-email-actions"
import { GmailComposeDialog } from "./gmail-compose-dialog"
import { PropertyDueHighlightClearButton } from "./property-due-highlight-clear-button"
import { PropertyDueWarningIndicator } from "./property-due-warning-indicator"
import type { PropertyRowActionControls } from "./property-list-row-action-controls"

const EMPTY_BUYERS: never[] = []
const NOOP = () => undefined

export interface PropertyListRowPinnedActionsProps {
  controls: PropertyRowActionControls
  propertyListId: number
  mapAddress: string
  propertyLabel: string
  composeSubject: string
  owner1name: string | null
  owner1email: string | null
  primaryBuyerEmail: string | null
  primaryBuyerEmailName: string | null
  dueHighlightActive: boolean
  dueHighlightLabels: string[]
  dueWarningActive: boolean
  dueWarningLabels: string[]
  dueWarningTier: DueWarningTier
  /** When true, render only the hide tick + map button (map-results view); no dialogs needed. */
  mapResultsOnly?: boolean
}

/**
 * Always-inline row controls (hide-from-view tick, due indicator, locate-on-map) plus all of the
 * per-row dialogs. Binds the dialog open handlers onto the shared {@link PropertyRowActionControls}
 * so the collapsible action descriptors can trigger them whether they render inline or in the menu.
 */
export function PropertyListRowPinnedActions({
  controls,
  propertyListId,
  mapAddress,
  propertyLabel,
  composeSubject,
  owner1name,
  owner1email,
  primaryBuyerEmail,
  primaryBuyerEmailName,
  dueHighlightActive,
  dueHighlightLabels,
  dueWarningActive,
  dueWarningLabels,
  dueWarningTier,
  mapResultsOnly = false,
}: PropertyListRowPinnedActionsProps) {
  const { openWithAddress } = usePropertyMapFilterOpen()
  const [noteOpen, setNoteOpen] = useState(false)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [buyerComposeOpen, setBuyerComposeOpen] = useState(false)

  controls.openNote = () => setNoteOpen(true)
  controls.openMeeting = () => setMeetingOpen(true)
  controls.openReminder = () => setReminderOpen(true)
  controls.openBuyerCompose = () => {
    if (primaryBuyerEmail) setBuyerComposeOpen(true)
  }

  const mapButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Locate on map"
          data-testid={`property-list-map-button--${propertyListId}`}
          onClick={() => openWithAddress(mapAddress, propertyListId)}
        >
          <Map data-icon="inline-start" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Locate on map</TooltipContent>
    </Tooltip>
  )

  if (mapResultsOnly) {
    return (
      <>
        <PropertyListRowHideFromViewCheckbox propertyListId={propertyListId} />
        {mapButton}
      </>
    )
  }

  return (
    <>
      <PropertyListRowHideFromViewCheckbox propertyListId={propertyListId} />

      {dueHighlightActive ? (
        <PropertyDueHighlightClearButton
          propertyListId={propertyListId}
          labels={dueHighlightLabels}
        />
      ) : dueWarningActive ? (
        <PropertyDueWarningIndicator
          propertyListId={propertyListId}
          labels={dueWarningLabels}
          tier={dueWarningTier}
        />
      ) : null}

      {mapButton}

      <PropertyListRowEmailDialogs
        controls={controls}
        propertyListId={propertyListId}
        owner1name={owner1name}
        owner1email={owner1email}
        composeSubject={composeSubject}
      />

      <PropertyListAddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        propertyListId={propertyListId}
        propertyLabel={propertyLabel}
      />

      <AddMeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        propertyListId={propertyListId}
        buyers={EMPTY_BUYERS}
        onAdded={NOOP}
        onSyncError={NOOP}
        defaultTitle={propertyLabel}
      />

      <AddReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        propertyListId={propertyListId}
        buyers={EMPTY_BUYERS}
        onAdded={NOOP}
      />

      {buyerComposeOpen && primaryBuyerEmail && (
        <GmailComposeDialog
          key={`buyer-compose-${propertyListId}`}
          open
          to={primaryBuyerEmail}
          subject={composeSubject}
          body={primaryBuyerEmailName ? `Dear ${primaryBuyerEmailName},\n\n` : ""}
          propertyListId={propertyListId}
          onClose={() => setBuyerComposeOpen(false)}
          inline
        />
      )}
    </>
  )
}
