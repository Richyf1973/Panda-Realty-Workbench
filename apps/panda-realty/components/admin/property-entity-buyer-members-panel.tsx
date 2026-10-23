"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Users } from "lucide-react"

import { Button } from "@repo/ui/button"
import { TooltipProvider } from "@repo/ui/tooltip"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import type { PropertyDetailBuyer } from "@/app/admin/properties/board/property-types"

import { AddBuyerNoteDialog } from "./add-buyer-note-dialog"
import { BuyerMemberDeleteDialog } from "./buyer-member-delete-dialog"
import { BuyerMemberDialog } from "./buyer-member-dialog"
import { BuyerMemberRow } from "./buyer-member-row"
import type { EntityMember } from "./buyer-member-types"
import { GmailComposeDialog, type GmailForwardContext } from "./gmail-compose-dialog"
import { fetchConnections, pickPrimary, type ConnectionSummary } from "./panda-entities-property-connections-data"
import { usePropertyEntityBuyerMembers } from "./use-property-entity-buyer-members"

export type BuyerMembersPanelSource = "entities" | "property-entity"

type ComposeState = { open: boolean; email: string; memberName: string }

interface PropertyEntityBuyerMembersPanelProps {
  entityId: number | null
  variant: "create" | "edit"
  membersPanelSource?: BuyerMembersPanelSource
  entityName: string
}

export function PropertyEntityBuyerMembersPanel({
  entityId,
  variant,
  membersPanelSource = "property-entity",
  entityName,
}: PropertyEntityBuyerMembersPanelProps) {
  const [composeDialog, setComposeDialog] = useState<ComposeState>({ open: false, email: "", memberName: "" })
  const [replyCompose, setReplyCompose] = useState<ComposeState>({ open: false, email: "", memberName: "" })
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
    repPatchMemberId,
    openAddDialog,
    openEditDialog,
    closeMemberDialog,
    saveMember,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    patchBuyersRepresentative,
  } = usePropertyEntityBuyerMembers({ entityId, variant })

  if (variant === "create") {
    const saveFirstMessage =
      membersPanelSource === "entities"
        ? "Save the buyer first to manage members."
        : "Save the property link first to manage members."
    return (
      <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground px-2">
        {saveFirstMessage}
      </div>
    )
  }

  const connectionDisabledReason = connectionsLoading
    ? "Loading property links…"
    : connections.length === 0
      ? "Link a property in Property Connections first."
      : null

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {loading
            ? "Loading…"
            : members.length === 0
              ? "No members yet"
              : `${members.length} member${members.length !== 1 ? "s" : ""}`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openAddDialog}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          Add new
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No members added yet.</p>
        </div>
      ) : (
        <TooltipProvider delayDuration={300}>
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <BuyerMemberRow
                key={m.entityMemberId}
                m={m}
                repPatchMemberId={repPatchMemberId}
                primaryPropertyEntityId={primaryPropertyEntityId}
                propertyListId={primaryPropertyListId}
                connectionDisabledReason={connectionDisabledReason}
                onCompose={(email, memberName) => setComposeDialog({ open: true, email, memberName })}
                onReply={(draft) => setReplyCompose({ open: true, email: draft.to, memberName: m.memberName })}
                onForward={(draft) => setForwardDraft({ messageId: draft.messageId, from: draft.from, date: draft.date, subject: draft.subject, body: draft.body, attachments: draft.attachments })}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onPatchRep={patchBuyersRepresentative}
                onAddEvent={() => setMeetingDialog(true)}
                onAddNote={() =>
                  primaryPropertyEntityId !== null &&
                  setAddNoteDialog({ open: true, propertyEntityId: primaryPropertyEntityId })
                }
                onAddReminder={() => setReminderDialog(true)}
              />
            ))}
          </ul>
        </TooltipProvider>
      )}

      <BuyerMemberDialog
        memberDialog={memberDialog}
        form={form}
        setForm={setForm}
        setMemberDialog={setMemberDialog}
        closeMemberDialog={closeMemberDialog}
        saveMember={saveMember}
      />
      <BuyerMemberDeleteDialog
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
          onClose={() => setComposeDialog({ open: false, email: "", memberName: "" })}
          inline
        />
      )}
      {replyCompose.open && (
        <GmailComposeDialog
          key={`reply-${replyCompose.email}`}
          open={replyCompose.open}
          to={replyCompose.email}
          subject={entityName}
          body={`Dear ${replyCompose.memberName},\n\n`}
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

