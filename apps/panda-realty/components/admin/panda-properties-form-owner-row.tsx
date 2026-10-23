"use client"

import { useState } from "react"
import { useStore, type Store } from "@tanstack/react-store"
import { Star } from "lucide-react"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"

import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"
import { FieldText } from "./panda-properties-form-fields"
import type { FormLike } from "./panda-properties-dialog-form-types"
import { OwnerExtraInfoDialog } from "./panda-properties-form-owner-extra-info-dialog"
import { OwnerRowActions } from "./panda-properties-form-owner-row-actions"
import { PropertyListOwnerFilesDialog } from "./property-list-owner-files-dialog"
import { PropertyListOwnerNotesDialog } from "./property-list-owner-notes-dialog"

export type FormValues = Record<string, string | null | undefined>
export type { EntityThreadForwardDraft, EntityThreadReplyDraft }

export function ownerHasData(values: FormValues, prefix: string): boolean {
  return !!values[`${prefix}name`]?.trim()
}

export function OwnerRow({
  form,
  propertyListId,
  propertyLabel,
  calendarConnected,
  ownerNum,
  prefix,
  primaryPhoneOwnerNum,
  primaryEmailOwnerNum,
  onSetPrimaryPhone,
  onSetPrimaryEmail,
  onCompose,
  onReply,
  onForward,
  onDelete,
}: {
  form: FormLike
  propertyListId: number | null
  propertyLabel: string
  calendarConnected: boolean | null
  ownerNum: 1 | 2 | 3
  prefix: "owner1" | "owner2" | "owner3"
  primaryPhoneOwnerNum: 1 | 2 | 3
  primaryEmailOwnerNum: 1 | 2 | 3
  onSetPrimaryPhone: (n: 1 | 2 | 3) => void
  onSetPrimaryEmail: (n: 1 | 2 | 3) => void
  onCompose: (email: string, name: string) => void
  onReply: (name: string, draft: EntityThreadReplyDraft) => void
  onForward: (draft: EntityThreadForwardDraft) => void
  onDelete?: () => void
}) {
  const ownerName = useStore(
    form.store as Store<{ values: FormValues }>,
    (s) => (s.values ?? {})[`${prefix}name`]?.trim() ?? "",
  )
  const ownerEmail = useStore(
    form.store as Store<{ values: FormValues }>,
    (s) => (s.values ?? {})[`${prefix}email`]?.trim() ?? "",
  )
  const ownerPhone = useStore(
    form.store as Store<{ values: FormValues }>,
    (s) => (s.values ?? {})[`${prefix}phone`]?.trim() ?? "",
  )

  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [ownerNotesOpen, setOwnerNotesOpen] = useState(false)
  const [ownerFilesOpen, setOwnerFilesOpen] = useState(false)
  const [addReminderOpen, setAddReminderOpen] = useState(false)
  const [extraInfoOpen, setExtraInfoOpen] = useState(false)

  const hasSavedProperty = propertyListId != null
  const hasEmail = ownerEmail !== ""
  const hasPhone = ownerPhone !== ""
  const showOwnerActions = hasSavedProperty && ownerName !== ""
  const showAnyActions = hasEmail || hasPhone || showOwnerActions || onDelete != null
  const addEventDisabled = !showOwnerActions || calendarConnected !== true
  const addEventTooltip =
    !showOwnerActions
      ? "Save the property first"
      : calendarConnected === false
        ? "Google Calendar not connected"
        : calendarConnected == null
          ? "Checking Google Calendar"
          : "Add event"

  function handleInboxToggle() {
    if (!showThreads && !hasOpened) setHasOpened(true)
    setShowThreads((v) => !v)
  }

  function handleCompose() {
    onCompose(ownerEmail, String(form.getFieldValue(`${prefix}name`) ?? ""))
  }

  function handleReply(draft: EntityThreadReplyDraft) {
    onReply(String(form.getFieldValue(`${prefix}name`) ?? ""), draft)
  }

  const isPhonePrimary = primaryPhoneOwnerNum === ownerNum
  const isEmailPrimary = primaryEmailOwnerNum === ownerNum

  return (
    <div className="col-span-1 flex flex-col gap-1.5 md:col-span-4">
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-4">
        <FieldText form={form} name={`${prefix}name`} label={`Owner ${ownerNum} name`} hideLabel placeholder="Name" className="min-w-0" />
        <FieldText form={form} name={`${prefix}address`} label={`Owner ${ownerNum} address`} hideLabel placeholder="Address" className="min-w-0" />
        <FieldText
          form={form}
          name={`${prefix}phone`}
          label={`Owner ${ownerNum} phone`}
          hideLabel
          placeholder="Phone"
          type="tel"
          autoComplete="tel"
          contactLink="tel"
          className="min-w-0"
          rightAction={
            <button
              type="button"
              aria-pressed={isPhonePrimary}
              aria-label={isPhonePrimary ? "Primary phone owner (active)" : "Set as primary phone owner"}
              data-testid={`panda-owner-phone-primary-star--${ownerNum}`}
              className={isPhonePrimary ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}
              onClick={() => onSetPrimaryPhone(ownerNum)}
            >
              <Star className="h-3.5 w-3.5" fill={isPhonePrimary ? "currentColor" : "none"} />
            </button>
          }
        />
        <FieldText
          form={form}
          name={`${prefix}email`}
          label={`Owner ${ownerNum} email`}
          hideLabel
          placeholder="Email"
          type="email"
          autoComplete="email"
          contactLink="mailto"
          className="min-w-0"
          rightAction={
            <button
              type="button"
              aria-pressed={isEmailPrimary}
              aria-label={isEmailPrimary ? "Primary email owner (active)" : "Set as primary email owner"}
              data-testid={`panda-owner-email-primary-star--${ownerNum}`}
              className={isEmailPrimary ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}
              onClick={() => onSetPrimaryEmail(ownerNum)}
            >
              <Star className="h-3.5 w-3.5" fill={isEmailPrimary ? "currentColor" : "none"} />
            </button>
          }
        />
      </div>
      {showAnyActions && (
        <OwnerRowActions
          ownerNum={ownerNum}
          hasPhone={hasPhone}
          ownerPhone={ownerPhone}
          hasEmail={hasEmail}
          showOwnerActions={showOwnerActions}
          showThreads={showThreads}
          addEventDisabled={addEventDisabled}
          addEventTooltip={addEventTooltip}
          onCompose={handleCompose}
          onInboxToggle={handleInboxToggle}
          onAddEvent={() => setAddEventOpen(true)}
          onNotes={() => setOwnerNotesOpen(true)}
          onFiles={() => setOwnerFilesOpen(true)}
          onAddReminder={() => setAddReminderOpen(true)}
          onMoreInfo={() => setExtraInfoOpen(true)}
          onDelete={onDelete}
        />
      )}
      {hasOpened && hasEmail && (
        <div className={showThreads ? "" : "hidden"}>
          <EntityThreadsPanel
            email={ownerEmail}
            onReply={handleReply}
            onForward={onForward}
            propertyListId={propertyListId}
            entityName={ownerName || null}
            ownerNum={ownerNum}
          />
        </div>
      )}
      {showOwnerActions && (
        <OwnerExtraInfoDialog
          open={extraInfoOpen}
          onOpenChange={setExtraInfoOpen}
          form={form}
          ownerNum={ownerNum}
          prefix={prefix}
        />
      )}
      {showOwnerActions && propertyListId != null && (
        <>
          <PropertyListOwnerNotesDialog
            open={ownerNotesOpen}
            onOpenChange={setOwnerNotesOpen}
            propertyListId={propertyListId}
            ownerNum={ownerNum}
            propertyLabel={propertyLabel}
          />
          <PropertyListOwnerFilesDialog
            open={ownerFilesOpen}
            onOpenChange={setOwnerFilesOpen}
            propertyListId={propertyListId}
            ownerNum={ownerNum}
            propertyLabel={propertyLabel}
          />
          <AddMeetingDialog
            open={addEventOpen}
            onOpenChange={setAddEventOpen}
            propertyListId={propertyListId}
            buyers={[]}
            onAdded={() => {}}
            onSyncError={() => {}}
            defaultTitle={`Meeting with ${ownerName}`}
          />
          <AddReminderDialog
            open={addReminderOpen}
            onOpenChange={setAddReminderOpen}
            propertyListId={propertyListId}
            buyers={[]}
            onAdded={() => undefined}
          />
        </>
      )}
    </div>
  )
}
