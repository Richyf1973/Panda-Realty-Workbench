"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Inbox } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/tooltip"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import type { PropertyDetailBuyer } from "@/app/admin/properties/board/property-types"

import { AddBuyerNoteDialog } from "./add-buyer-note-dialog"
import { ContactMemberDeleteDialog } from "./contact-member-delete-dialog"
import { ContactMemberDialog } from "./contact-member-dialog"
import type { ContactMember } from "./contact-member-types"
import { ContactMembersList } from "./contact-members-list"
import { EntityThreadsPanel } from "./entity-threads-panel"
import { GmailComposeDialog, type GmailForwardContext } from "./gmail-compose-dialog"
import { fetchConnections, pickPrimary, type ConnectionSummary } from "./panda-entities-property-connections-data"
import { useContactMembers } from "./use-contact-members"

interface ContactMembersPanelProps {
  entityId: number | null
  variant: "create" | "edit"
  entityName: string
  propertyListId?: number | null
}

export function ContactMembersPanel({ entityId, variant, entityName, propertyListId: currentPropertyListId }: ContactMembersPanelProps) {
  const [composeDialog, setComposeDialog] = useState<{ open: boolean; email: string; memberName: string }>({
    open: false,
    email: "",
    memberName: "",
  })
  const [replyCompose, setReplyCompose] = useState<{ open: boolean; email: string; memberName: string; replyContext?: { threadId: string; messageId: string } }>({
    open: false,
    email: "",
    memberName: "",
  })
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)
  const [connections, setConnections] = useState<ConnectionSummary[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [meetingDialog, setMeetingDialog] = useState(false)
  const [reminderDialog, setReminderDialog] = useState(false)
  const [addNoteDialog, setAddNoteDialog] = useState<{ open: boolean; propertyEntityId: number | null }>({
    open: false,
    propertyEntityId: null,
  })

  const loadConnections = useCallback(async () => {
    if (entityId === null) return
    setConnectionsLoading(true)
    try {
      const result = await fetchConnections(String(entityId))
      setConnections(result.ok ? result.items : [])
    } finally {
      setConnectionsLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    if (variant !== "edit" || entityId === null) {
      setConnections([])
      return
    }
    void loadConnections()
  }, [variant, entityId, loadConnections])

  const primary = useMemo(() => pickPrimary(connections), [connections])
  const primaryPropertyListId = primary?.propertyListId != null ? Number(primary.propertyListId) : null
  const primaryPropertyEntityId = primary?.propertyEntityId ?? null

  const buyersForDialog: PropertyDetailBuyer[] = useMemo(() => {
    if (primary === null || entityId === null) return []
    return [
      {
        propertyEntityId: primary.propertyEntityId,
        entityId,
        entityName,
        phoneNumber: null,
        emailAddress: null,
        memberPropertyToSellAddress: null,
        memberResidenceAddress: null,
        offers: [],
      },
    ]
  }, [primary, entityId, entityName])

  const {
    members,
    loading,
    loadError,
    memberDialog,
    setMemberDialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    openEditDialog,
    closeMemberDialog,
    saveMember,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useContactMembers({ entityId, variant })

  const [showGeneralThreads, setShowGeneralThreads] = useState(false)
  const [hasGeneralOpened, setHasGeneralOpened] = useState(false)

  function handleGeneralInboxToggle() {
    if (!showGeneralThreads && !hasGeneralOpened) setHasGeneralOpened(true)
    setShowGeneralThreads((v) => !v)
  }

  if (variant === "create") {
    return (
      <div className="flex flex-col gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 px-2"
                  disabled
                  data-testid="contact-members-panel-general-inbox"
                >
                  <Inbox className="h-4 w-4" />
                  <span className="text-xs">All correspondence</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Save the contact first to view correspondence</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex h-16 items-center justify-center text-center text-sm text-muted-foreground px-2">
          Save the contact first to manage representatives.
        </div>
      </div>
    )
  }

  const connectionDisabledReason = connectionsLoading
    ? "Loading property links…"
    : connections.length === 0
      ? "Link a property in Property Connections first."
      : null

  return (
    <div className="flex flex-col gap-2">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                size="sm"
                variant={showGeneralThreads ? "secondary" : "ghost"}
                className="h-8 gap-1.5 px-2"
                disabled={entityId === null}
                onClick={entityId !== null ? handleGeneralInboxToggle : undefined}
                data-testid="contact-members-panel-general-inbox"
              >
                <Inbox className="h-4 w-4" />
                <span className="text-xs">All correspondence</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {entityId !== null ? "View all correspondence (entity + members)" : "Save the contact first to view correspondence"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasGeneralOpened && entityId !== null && (
        <div className={showGeneralThreads ? "" : "hidden"}>
          <EntityThreadsPanel
            entityId={entityId}
            propertyListId={currentPropertyListId ?? primaryPropertyListId}
            propertyEntityId={primaryPropertyEntityId}
            entityName={entityName}
            onReply={(draft) => setReplyCompose({ open: true, email: draft.to, memberName: entityName, replyContext: { threadId: draft.threadId, messageId: draft.messageId } })}
            onForward={(draft) =>
              setForwardDraft({
                messageId: draft.messageId,
                from: draft.from,
                date: draft.date,
                subject: draft.subject,
                body: draft.body,
                attachments: draft.attachments,
              })
            }
          />
        </div>
      )}

      <ContactMembersList
        members={members}
        loading={loading}
        loadError={loadError}
        connectionDisabledReason={connectionDisabledReason}
        primaryPropertyEntityId={primaryPropertyEntityId}
        primaryPropertyListId={primaryPropertyListId}
        onCompose={(email, memberName) => setComposeDialog({ open: true, email, memberName })}
        onReply={(draft, memberName) => setReplyCompose({ open: true, email: draft.to, memberName, replyContext: { threadId: draft.threadId, messageId: draft.messageId } })}
        onForward={(draft) => setForwardDraft({ messageId: draft.messageId, from: draft.from, date: draft.date, subject: draft.subject, body: draft.body, attachments: draft.attachments })}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        onAddEvent={() => setMeetingDialog(true)}
        onAddNote={(propertyEntityId) => setAddNoteDialog({ open: true, propertyEntityId })}
        onAddReminder={() => setReminderDialog(true)}
        onAdd={openAddDialog}
      />

      <ContactMemberDialog
        memberDialog={memberDialog}
        form={form}
        setForm={setForm}
        closeMemberDialog={closeMemberDialog}
        saveMember={saveMember}
      />
      <ContactMemberDeleteDialog
        deleteDialog={deleteDialog}
        closeDeleteDialog={closeDeleteDialog}
        confirmDelete={confirmDelete}
      />
      {composeDialog.open && (
        <GmailComposeDialog
          key={`compose-${composeDialog.email}-${composeDialog.memberName}`}
          open={composeDialog.open}
          to={composeDialog.email}
          subject={entityName}
          body={`Dear ${composeDialog.memberName},\n\n`}
          propertyListId={currentPropertyListId ?? primaryPropertyListId ?? undefined}
          onClose={() => setComposeDialog({ open: false, email: "", memberName: "" })}
          inline
        />
      )}
      {replyCompose.open && (
        <GmailComposeDialog
          key={`reply-${replyCompose.email}-${replyCompose.replyContext?.threadId ?? ""}`}
          open={replyCompose.open}
          to={replyCompose.email}
          subject={entityName}
          body={`Dear ${replyCompose.memberName},\n\n`}
          propertyListId={currentPropertyListId ?? primaryPropertyListId ?? undefined}
          replyContext={replyCompose.replyContext}
          onClose={() => setReplyCompose({ open: false, email: "", memberName: "" })}
          inline
        />
      )}
      {forwardDraft && (
        <GmailComposeDialog
          key={`forward-${forwardDraft.messageId}`}
          open={true}
          to=""
          subject=""
          body=""
          propertyListId={currentPropertyListId ?? primaryPropertyListId ?? undefined}
          forwardContext={forwardDraft}
          onClose={() => setForwardDraft(null)}
          inline
        />
      )}
      {primaryPropertyListId !== null && primary !== null && (
        <>
          <AddMeetingDialog
            open={meetingDialog}
            onOpenChange={setMeetingDialog}
            propertyListId={primaryPropertyListId}
            buyers={buyersForDialog}
            defaultBuyerId={primary.propertyEntityId}
            onAdded={() => setMeetingDialog(false)}
          />
          <AddReminderDialog
            open={reminderDialog}
            onOpenChange={setReminderDialog}
            propertyListId={primaryPropertyListId}
            buyers={buyersForDialog}
            defaultBuyerId={primary.propertyEntityId}
            onAdded={() => setReminderDialog(false)}
          />
        </>
      )}
      {addNoteDialog.propertyEntityId !== null && (
        <AddBuyerNoteDialog
          open={addNoteDialog.open}
          onOpenChange={(open) => setAddNoteDialog((prev) => ({ ...prev, open }))}
          propertyEntityId={addNoteDialog.propertyEntityId}
          onSuccess={() => setAddNoteDialog({ open: false, propertyEntityId: null })}
        />
      )}
    </div>
  )
}
