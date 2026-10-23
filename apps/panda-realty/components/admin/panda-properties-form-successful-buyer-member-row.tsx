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
import { BuyerOwnerRowActions } from "./property-buyer-owner-row-actions"
import type { BuyerOfferMember } from "./panda-properties-dialog-form-types"

interface Props {
  member: BuyerOfferMember
  /** Buyer entity id — member edits PATCH entity_members; star clicks PATCH this entity. */
  entityId: number
  /** Accepted buyer's property_entity id — scopes meeting/reminder/thread context. */
  propertyEntityId: number
  propertyListId: number
  propertyAddress: string
  calendarConnected: boolean | null
  isPrimaryPhone: boolean
  isPrimaryEmail: boolean
  onSetPrimaryPhone: () => void
  onSetPrimaryEmail: () => void
  onOpenProfile: () => void
}

type ComposeState =
  | { open: true; to: string; subject: string; body: string; replyContext?: { threadId: string; messageId: string } }
  | { open: false }

/**
 * PATCH a member field via the successful-buyer route, which also forward-syncs
 * the value into the latest offer-form submission (keeps the read-only Offer
 * Form Submission panel consistent with these editable rows).
 */
async function patchMember(
  entityMemberId: number,
  field: "memberName" | "memberAddress" | "memberPhoneNumber" | "memberEmailAddress",
  value: string,
  propertyListId: number,
  propertyEntityId: number,
) {
  await fetch(`/api/admin/properties/${propertyListId}/successful-buyer-member/${entityMemberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value: value.trim() || null, propertyEntityId }),
  })
}

/** One SUCCESSFUL BUYER member row — Name/Address/Phone/Email editable like the seller rows. */
export function PandaPropertiesFormSuccessfulBuyerMemberRow({
  member,
  entityId,
  propertyEntityId,
  propertyListId,
  propertyAddress,
  calendarConnected,
  isPrimaryPhone,
  isPrimaryEmail,
  onSetPrimaryPhone,
  onSetPrimaryEmail,
  onOpenProfile,
}: Props) {
  const id = member.entityMemberId
  const [name, setName] = useState(member.memberName)
  const [address, setAddress] = useState(member.memberAddress ?? "")
  const [phone, setPhone] = useState(member.memberPhoneNumber ?? "")
  const [email, setEmail] = useState(member.memberEmailAddress ?? "")

  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [composeState, setComposeState] = useState<ComposeState>({ open: false })
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)

  const hasPhone = phone.trim() !== ""
  const hasEmail = email.trim() !== ""

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

  const buyerForDialog: PropertyDetailBuyer = {
    propertyEntityId,
    entityId,
    entityName: name,
    phoneNumber: phone || null,
    emailAddress: email || null,
    memberPropertyToSellAddress: null,
    memberResidenceAddress: null,
    offers: [],
  }

  return (
    <div
      className="col-span-1 flex flex-col gap-1.5 md:col-span-4"
      data-testid={`panda-properties-form-successful-buyer-member-row--${id}`}
    >
      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-4">
        <div className="relative min-w-0">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void patchMember(id, "memberName", name, propertyListId, propertyEntityId)}
            placeholder="Name"
            aria-label="Buyer name"
            data-testid={`panda-properties-form-successful-buyer-member-name--${id}`}
            className="min-w-0 pr-7"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Open buyer profile"
            data-testid={`panda-properties-form-successful-buyer-member-open-profile--${id}`}
            onClick={onOpenProfile}
          >
            ↗
          </button>
        </div>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => void patchMember(id, "memberAddress", address, propertyListId, propertyEntityId)}
          placeholder="Address"
          aria-label="Buyer address"
          data-testid={`panda-properties-form-successful-buyer-member-address--${id}`}
          className="min-w-0"
        />
        <div className="relative min-w-0">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => void patchMember(id, "memberPhoneNumber", phone, propertyListId, propertyEntityId)}
            placeholder="Phone"
            type="tel"
            aria-label="Buyer phone"
            data-testid={`panda-properties-form-successful-buyer-member-phone--${id}`}
            className="min-w-0 pr-7"
          />
          <button
            type="button"
            aria-pressed={isPrimaryPhone}
            aria-label={isPrimaryPhone ? "Primary phone buyer (active)" : "Set as primary phone buyer"}
            data-testid={`panda-properties-form-successful-buyer-member-phone-primary--${id}`}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${isPrimaryPhone ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}
            onClick={() => !isPrimaryPhone && onSetPrimaryPhone()}
          >
            <Star className="h-3.5 w-3.5" fill={isPrimaryPhone ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="relative min-w-0">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => void patchMember(id, "memberEmailAddress", email, propertyListId, propertyEntityId)}
            placeholder="Email"
            type="email"
            aria-label="Buyer email"
            data-testid={`panda-properties-form-successful-buyer-member-email--${id}`}
            className="min-w-0 pr-7"
          />
          <button
            type="button"
            aria-pressed={isPrimaryEmail}
            aria-label={isPrimaryEmail ? "Primary email buyer (active)" : "Set as primary email buyer"}
            data-testid={`panda-properties-form-successful-buyer-member-email-primary--${id}`}
            className={`absolute right-2 top-1/2 -translate-y-1/2 ${isPrimaryEmail ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"}`}
            onClick={() => !isPrimaryEmail && onSetPrimaryEmail()}
          >
            <Star className="h-3.5 w-3.5" fill={isPrimaryEmail ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="md:col-span-4">
        <TooltipProvider delayDuration={300}>
          <BuyerOwnerRowActions
            testidPrefix="panda-properties-form-successful-buyer-member"
            propertyEntityId={id}
            entityName={name}
            hasPhone={hasPhone}
            phone={phone}
            hasEmail={hasEmail}
            showThreads={showThreads}
            calendarConnected={calendarConnected}
            onCompose={() => setComposeState({ open: true, to: email, subject: propertyAddress, body: `Dear ${name},\n\n` })}
            onInboxToggle={handleInboxToggle}
            onAddEvent={() => setMeetingOpen(true)}
            onAddReminder={() => setReminderOpen(true)}
          />
        </TooltipProvider>
      </div>

      {hasOpened && hasEmail && (
        <div className={showThreads ? "" : "hidden"}>
          <EntityThreadsPanel
            entityId={entityId}
            email={email.trim()}
            propertyListId={propertyListId}
            propertyEntityId={propertyEntityId}
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
      <AddMeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        propertyListId={propertyListId}
        buyers={[buyerForDialog]}
        defaultBuyerId={propertyEntityId}
        onAdded={() => setMeetingOpen(false)}
      />
      <AddReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        propertyListId={propertyListId}
        buyers={[buyerForDialog]}
        defaultBuyerId={propertyEntityId}
        onAdded={() => setReminderOpen(false)}
      />
    </div>
  )
}
