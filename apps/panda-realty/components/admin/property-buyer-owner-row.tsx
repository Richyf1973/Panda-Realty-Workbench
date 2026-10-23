"use client"

import { useState } from "react"
import { Star } from "lucide-react"

import { Input } from "@repo/ui/input"
import { TooltipProvider } from "@repo/ui/tooltip"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import type { PropertyDetailBuyer } from "@/app/admin/properties/board/property-types"

import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"
import { GmailComposeDialog, type GmailForwardContext } from "./gmail-compose-dialog"
import { PropertyEntityFilesDialog } from "./property-entity-files-dialog"
import { PropertyEntityNotesDialog } from "./property-entity-notes-dialog"
import { BuyerOwnerRowActions } from "./property-buyer-owner-row-actions"
import { PropertyBuyerPanelOffersDialog } from "./property-buyer-panel-offers-dialog"
import type { PropertyBuyerPanel } from "./property-buyer-panel-types"

interface BuyerOwnerRowProps {
  buyer: PropertyBuyerPanel
  propertyListId: number | null
  calendarConnected: boolean | null
  onDelete: () => void
  onOpenProfile?: () => void
  onSetPrimaryPhone?: (propertyEntityId: number) => void
  onSetPrimaryEmail?: (propertyEntityId: number) => void
}

async function patchBuyerEntity(entityId: number, fields: Record<string, string | null>) {
  await fetch(`/api/admin/entities/${entityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  })
}

type ComposeState = { open: true; to: string; subject: string; body: string; replyContext?: { threadId: string; messageId: string } } | { open: false }

export function BuyerOwnerRow({ buyer, propertyListId, calendarConnected, onDelete, onOpenProfile, onSetPrimaryPhone, onSetPrimaryEmail }: BuyerOwnerRowProps) {
  const [name, setName] = useState(buyer.entityName)
  const [address, setAddress] = useState(buyer.address ?? "")
  const [phone, setPhone] = useState(buyer.phoneNumber ?? "")
  const [email, setEmail] = useState(buyer.emailAddress ?? "")

  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  const [composeState, setComposeState] = useState<ComposeState>({ open: false })
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [offersOpen, setOffersOpen] = useState(false)

  function handleInboxToggle() {
    if (!showThreads && !hasOpened) setHasOpened(true)
    setShowThreads((v) => !v)
  }

  function handleReply(draft: EntityThreadReplyDraft) {
    setComposeState({ open: true, to: draft.to, subject: draft.subject, body: `Dear ${name},\n\n`, replyContext: { threadId: draft.threadId, messageId: draft.messageId } })
  }

  function handleForward(draft: EntityThreadForwardDraft) {
    setForwardDraft({ messageId: draft.messageId, from: draft.from, date: draft.date, subject: draft.subject, body: draft.body, attachments: draft.attachments })
  }

  async function handleBlur(field: "entityName" | "contact" | "emailAddress" | "address", value: string) {
    await patchBuyerEntity(buyer.entityId, { [field]: value.trim() || null })
  }

  const hasPhone = phone.trim() !== ""
  const hasEmail = email.trim() !== ""
  const id = buyer.propertyEntityId

  const buyerForDialog: PropertyDetailBuyer = {
    propertyEntityId: id,
    entityId: buyer.entityId,
    entityName: name,
    phoneNumber: buyer.phoneNumber,
    emailAddress: buyer.emailAddress,
    memberPropertyToSellAddress: null,
    memberResidenceAddress: null,
    offers: [],
  }

  return (
    <div className="col-span-1 flex flex-col gap-1.5 md:col-span-4" data-testid={`property-buyer-owner-row--${id}`}>
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-4">
        <div className="relative min-w-0">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void handleBlur("entityName", name)}
            placeholder="Name"
            aria-label="Buyer name"
            data-testid={`property-buyer-owner-row-name--${id}`}
            className="min-w-0 pr-7"
          />
          {onOpenProfile && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Open buyer profile"
              data-testid={`property-buyer-owner-row-open-profile--${id}`}
              onClick={onOpenProfile}
            >
              ↗
            </button>
          )}
        </div>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => void handleBlur("address", address)}
          placeholder="Address"
          aria-label="Buyer address"
          data-testid={`property-buyer-owner-row-address--${id}`}
          className="min-w-0"
        />
        <div className="relative min-w-0">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => void handleBlur("contact", phone)}
            placeholder="Phone"
            type="tel"
            aria-label="Buyer phone"
            data-testid={`property-buyer-owner-row-phone--${id}`}
            className="min-w-0 pr-7"
          />
          <button
            type="button"
            aria-pressed={buyer.isPrimaryPhone}
            aria-label={buyer.isPrimaryPhone ? "Primary phone buyer (active)" : "Set as primary phone buyer"}
            data-testid={`panda-buyer-phone-primary-star--${id}`}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${buyer.isPrimaryPhone ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}
            onClick={() => !buyer.isPrimaryPhone && onSetPrimaryPhone?.(id)}
          >
            <Star className="h-3.5 w-3.5" fill={buyer.isPrimaryPhone ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="relative min-w-0">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => void handleBlur("emailAddress", email)}
            placeholder="Email"
            type="email"
            aria-label="Buyer email"
            data-testid={`property-buyer-owner-row-email--${id}`}
            className="min-w-0 pr-7"
          />
          <button
            type="button"
            aria-pressed={buyer.isPrimaryEmail}
            aria-label={buyer.isPrimaryEmail ? "Primary email buyer (active)" : "Set as primary email buyer"}
            data-testid={`panda-buyer-email-primary-star--${id}`}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${buyer.isPrimaryEmail ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}
            onClick={() => !buyer.isPrimaryEmail && onSetPrimaryEmail?.(id)}
          >
            <Star className="h-3.5 w-3.5" fill={buyer.isPrimaryEmail ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:col-span-4">
        <TooltipProvider delayDuration={300}>
          <BuyerOwnerRowActions
            testidPrefix="property-buyer-owner-row"
            propertyEntityId={id}
            entityName={name}
            hasPhone={hasPhone}
            phone={phone}
            hasEmail={hasEmail}
            showThreads={showThreads}
            calendarConnected={calendarConnected}
            onCompose={() => setComposeState({ open: true, to: email, subject: name, body: `Dear ${name},\n\n` })}
            onInboxToggle={handleInboxToggle}
            onAddEvent={() => setMeetingOpen(true)}
            onNotes={() => setNotesOpen(true)}
            onFiles={() => setFilesOpen(true)}
            onAddReminder={() => setReminderOpen(true)}
            onOffers={() => setOffersOpen(true)}
            onDelete={onDelete}
          />
        </TooltipProvider>
        {buyer.hasOfferFormSubmission && (
          <span
            className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
            data-testid={`property-buyer-owner-row-form-submitted-badge--${id}`}
          >
            Form Submitted
          </span>
        )}
      </div>

      {hasOpened && hasEmail && (
        <div className={showThreads ? "" : "hidden"}>
          <EntityThreadsPanel
            entityId={buyer.entityId}
            email={email.trim()}
            propertyListId={propertyListId}
            propertyEntityId={id}
            entityName={name}
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

      <PropertyEntityNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        propertyEntityId={id}
        entityName={name}
      />
      <PropertyEntityFilesDialog
        open={filesOpen}
        onOpenChange={setFilesOpen}
        propertyEntityId={id}
        entityName={name}
      />
      <PropertyBuyerPanelOffersDialog
        open={offersOpen}
        propertyEntityId={id}
        entityName={name}
        onClose={() => setOffersOpen(false)}
      />

      {propertyListId != null && (
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
    </div>
  )
}
