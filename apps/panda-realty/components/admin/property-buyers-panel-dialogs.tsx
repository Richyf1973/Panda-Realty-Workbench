"use client"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import type { PropertyDetailBuyer } from "@/app/admin/properties/board/property-types"

import { PropertyEntityNotesDialog } from "./property-entity-notes-dialog"
import { GmailComposeDialog } from "./gmail-compose-dialog"
import type { PropertyBuyerPanel } from "./property-buyer-panel-types"
import type { ComposeDialogState } from "./use-property-buyers-panel-dialog-state"

function toBuyerDialogShape(buyers: PropertyBuyerPanel[]): PropertyDetailBuyer[] {
  return buyers.map((b) => ({
    propertyEntityId: b.propertyEntityId,
    entityId: b.entityId,
    entityName: b.entityName,
    phoneNumber: b.phoneNumber ?? null,
    emailAddress: b.emailAddress ?? null,
    memberPropertyToSellAddress: null,
    memberResidenceAddress: null,
    offers: [],
  }))
}

interface Props {
  validId: number | null
  buyers: PropertyBuyerPanel[]
  refreshBuyers: () => Promise<void>
  composeDialog: ComposeDialogState
  onCloseCompose: () => void
  meetingDialog: { open: boolean; defaultTitle: string; defaultBuyerId: number | null }
  onMeetingOpenChange: (open: boolean) => void
  addNoteDialog: { open: boolean; propertyEntityId: number | null; entityName: string }
  onNoteOpenChange: (open: boolean) => void
  onNoteSuccess: () => void
  reminderDialog: { open: boolean; defaultBuyerId: number | null }
  onReminderOpenChange: (open: boolean) => void
}

export function PropertyBuyersPanelDialogs({
  validId,
  buyers,
  refreshBuyers,
  composeDialog,
  onCloseCompose,
  meetingDialog,
  onMeetingOpenChange,
  addNoteDialog,
  onNoteOpenChange,
  onNoteSuccess,
  reminderDialog,
  onReminderOpenChange,
}: Props) {
  return (
    <>
      {composeDialog.open && (
        <GmailComposeDialog
          key={`${composeDialog.email}-${composeDialog.entityName}`}
          open={composeDialog.open}
          to={composeDialog.email}
          subject={composeDialog.subject}
          body={composeDialog.body}
          propertyListId={validId}
          replyContext={composeDialog.replyContext}
          onClose={onCloseCompose}
          inline
        />
      )}
      {validId != null && (
        <AddMeetingDialog
          open={meetingDialog.open}
          onOpenChange={onMeetingOpenChange}
          propertyListId={validId}
          buyers={toBuyerDialogShape(buyers)}
          onAdded={refreshBuyers}
          onSyncError={() => undefined}
          defaultTitle={meetingDialog.defaultTitle}
          defaultBuyerId={meetingDialog.defaultBuyerId ?? undefined}
        />
      )}
      <PropertyEntityNotesDialog
        open={addNoteDialog.open}
        onOpenChange={onNoteOpenChange}
        propertyEntityId={addNoteDialog.propertyEntityId}
        entityName={addNoteDialog.entityName}
      />
      {validId != null && reminderDialog.open && (
        <AddReminderDialog
          open={reminderDialog.open}
          onOpenChange={onReminderOpenChange}
          propertyListId={validId}
          buyers={toBuyerDialogShape(buyers)}
          defaultBuyerId={reminderDialog.defaultBuyerId ?? undefined}
          onAdded={refreshBuyers}
        />
      )}
    </>
  )
}
