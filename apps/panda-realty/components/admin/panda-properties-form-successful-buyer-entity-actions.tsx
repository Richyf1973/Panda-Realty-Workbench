"use client"

import { useCallback, useState } from "react"
import { TooltipProvider } from "@repo/ui/tooltip"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import type { PropertyDetailBuyer } from "@/app/admin/properties/board/property-types"
import { ensureBuyerPortalToken, loadBuyerPortalToken } from "@/lib/buyer-portal-token"
import { openBuyerPortal } from "@/lib/open-buyer-portal"

import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"
import { GmailComposeDialog, type GmailForwardContext } from "./gmail-compose-dialog"
import { InlinePortalMessages } from "./inline-portal-messages"
import { PropertyEntityFilesDialog } from "./property-entity-files-dialog"
import { PropertyEntityNotesDialog } from "./property-entity-notes-dialog"
import { BuyerOwnerRowActions } from "./property-buyer-owner-row-actions"
import { PropertyBuyerPanelOffersDialog } from "./property-buyer-panel-offers-dialog"

interface Props {
  propertyEntityId: number
  entityId: number
  entityName: string
  propertyListId: number
  propertyAddress: string
  calendarConnected: boolean | null
  /**
   * When true (the no-member fallback), the toolbar also renders the contact actions
   * (Call/Email/Inbox/Calendar/Reminder) and their dialogs, scoped to the entity contact.
   */
  showContactActions: boolean
  /** Entity-level contact, only used when `showContactActions` is true. */
  phone?: string
  email?: string
  /** Deep link: auto-open the buyer's portal messages on mount (from a notification email link). */
  autoOpenMessages?: boolean
}

type ComposeState =
  | { open: true; to: string; subject: string; body: string; replyContext?: { threadId: string; messageId: string } }
  | { open: false }

/**
 * Property-entity-level actions for the SUCCESSFUL BUYER (Notes / Files / Offers / Open Portal /
 * Messages), rendered once below the member rows. Also hosts the contact-action cluster + dialogs
 * for the zero-member fallback.
 */
export function PandaPropertiesFormSuccessfulBuyerEntityActions({
  propertyEntityId,
  entityId,
  entityName,
  propertyListId,
  propertyAddress,
  calendarConnected,
  showContactActions,
  phone = "",
  email = "",
  autoOpenMessages = false,
}: Props) {
  const id = propertyEntityId

  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [composeState, setComposeState] = useState<ComposeState>({ open: false })
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [offersOpen, setOffersOpen] = useState(false)

  const loadBuyerToken = useCallback(() => loadBuyerPortalToken(id), [id])
  const ensureBuyerToken = useCallback(() => ensureBuyerPortalToken(id, propertyListId), [id, propertyListId])

  const hasPhone = phone.trim() !== ""
  const hasEmail = email.trim() !== ""

  function handleInboxToggle() {
    if (!showThreads && !hasOpened) setHasOpened(true)
    setShowThreads((v) => !v)
  }

  function handleReply(draft: EntityThreadReplyDraft) {
    setComposeState({ open: true, to: draft.to, subject: draft.subject, body: `Dear ${entityName},\n\n`, replyContext: { threadId: draft.threadId, messageId: draft.messageId } })
  }

  function handleForward(draft: EntityThreadForwardDraft) {
    setForwardDraft({ messageId: draft.messageId, from: draft.from, date: draft.date, subject: draft.subject, body: draft.body, attachments: draft.attachments })
  }

  const buyerForDialog: PropertyDetailBuyer = {
    propertyEntityId: id,
    entityId,
    entityName,
    phoneNumber: phone || null,
    emailAddress: email || null,
    memberPropertyToSellAddress: null,
    memberResidenceAddress: null,
    offers: [],
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <BuyerOwnerRowActions
          testidPrefix="panda-properties-form-successful-buyer"
          propertyEntityId={id}
          entityName={entityName}
          hasPhone={hasPhone}
          phone={phone}
          hasEmail={hasEmail}
          showThreads={showThreads}
          calendarConnected={calendarConnected}
          onCompose={showContactActions ? () => setComposeState({ open: true, to: email, subject: propertyAddress, body: `Dear ${entityName},\n\n` }) : undefined}
          onInboxToggle={showContactActions ? handleInboxToggle : undefined}
          onAddEvent={showContactActions ? () => setMeetingOpen(true) : undefined}
          onAddReminder={showContactActions ? () => setReminderOpen(true) : undefined}
          onNotes={() => setNotesOpen(true)}
          onFiles={() => setFilesOpen(true)}
          onOffers={() => setOffersOpen(true)}
          onOpenPortal={() => void openBuyerPortal(id)}
          messagesSlot={
            <InlinePortalMessages
              buttonTestId={`panda-properties-form-successful-buyer-messages--${id}`}
              unreadTestId={`panda-properties-form-successful-buyer-messages-unread--${id}`}
              panelTestId={`panda-properties-form-successful-buyer-messages-panel--${id}`}
              buttonClassName="h-7 gap-1.5 px-2"
              loadToken={loadBuyerToken}
              ensureToken={ensureBuyerToken}
              autoOpen={autoOpenMessages}
            />
          }
        />
      </TooltipProvider>

      {showContactActions && hasOpened && hasEmail && (
        <div className={`pt-2 ${showThreads ? "" : "hidden"}`}>
          <EntityThreadsPanel
            entityId={entityId}
            email={email.trim()}
            propertyListId={propertyListId}
            propertyEntityId={id}
            entityName={entityName}
            onReply={handleReply}
            onForward={handleForward}
          />
        </div>
      )}

      {composeState.open && (
        <GmailComposeDialog
          key={`compose-${id}-${composeState.to}`}
          open
          to={composeState.to}
          subject={composeState.subject}
          body={composeState.body}
          propertyListId={propertyListId}
          replyContext={composeState.replyContext}
          onClose={() => setComposeState({ open: false })}
          inline
        />
      )}
      {forwardDraft && (
        <GmailComposeDialog
          key={`forward-${forwardDraft.messageId}`}
          open
          to=""
          subject=""
          body=""
          propertyListId={propertyListId}
          forwardContext={forwardDraft}
          onClose={() => setForwardDraft(null)}
          inline
        />
      )}
      <PropertyBuyerPanelOffersDialog
        open={offersOpen}
        propertyEntityId={id}
        entityName={entityName}
        onClose={() => setOffersOpen(false)}
      />
      <PropertyEntityNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        propertyEntityId={id}
        entityName={entityName}
      />
      <PropertyEntityFilesDialog
        open={filesOpen}
        onOpenChange={setFilesOpen}
        propertyEntityId={id}
        entityName={entityName}
      />
      {showContactActions && (
        <>
          <AddMeetingDialog
            open={meetingOpen}
            onOpenChange={setMeetingOpen}
            propertyListId={propertyListId}
            buyers={[buyerForDialog]}
            defaultBuyerId={id}
            onAdded={() => setMeetingOpen(false)}
          />
          <AddReminderDialog
            open={reminderOpen}
            onOpenChange={setReminderOpen}
            propertyListId={propertyListId}
            buyers={[buyerForDialog]}
            defaultBuyerId={id}
            onAdded={() => setReminderOpen(false)}
          />
        </>
      )}
    </>
  )
}
