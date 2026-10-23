"use client"

import { Loader2, Plus, Users } from "lucide-react"

import { Button } from "@repo/ui/button"
import { TooltipProvider } from "@repo/ui/tooltip"

import { ContactMemberRow } from "./contact-member-row"
import type { ContactMember } from "./contact-member-types"
import type { EntityThreadForwardDraft, EntityThreadReplyDraft } from "./entity-threads-panel"

interface ContactMembersListProps {
  members: ContactMember[]
  loading: boolean
  loadError: string | null
  connectionDisabledReason: string | null
  primaryPropertyEntityId: number | null
  primaryPropertyListId: number | null
  onCompose: (email: string, memberName: string) => void
  onReply: (draft: EntityThreadReplyDraft, memberName: string) => void
  onForward: (draft: EntityThreadForwardDraft) => void
  onEdit: (m: ContactMember) => void
  onDelete: (m: ContactMember) => void
  onAddEvent: () => void
  onAddNote: (propertyEntityId: number) => void
  onAddReminder: () => void
  onAdd: () => void
}

export function ContactMembersList({
  members,
  loading,
  loadError,
  connectionDisabledReason,
  primaryPropertyEntityId,
  primaryPropertyListId,
  onCompose,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onAddEvent,
  onAddNote,
  onAddReminder,
  onAdd,
}: ContactMembersListProps) {
  return (
    <>
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
          onClick={onAdd}
          disabled={loading}
          data-testid="contact-members-panel-add-new"
        >
          <Plus className="h-4 w-4" />
          Add new
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 py-4 text-muted-foreground">
          <Users className="h-8 w-8 opacity-30" />
          <p className="text-sm">No representatives added yet.</p>
        </div>
      ) : (
        <TooltipProvider delayDuration={300}>
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <ContactMemberRow
                key={m.entityMemberId}
                m={m}
                connectionDisabledReason={connectionDisabledReason}
                primaryPropertyEntityId={primaryPropertyEntityId}
                propertyListId={primaryPropertyListId}
                onCompose={onCompose}
                onReply={(draft) => onReply(draft, m.memberName)}
                onForward={onForward}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddEvent={onAddEvent}
                onAddNote={() => primaryPropertyEntityId !== null && onAddNote(primaryPropertyEntityId)}
                onAddReminder={onAddReminder}
              />
            ))}
          </ul>
        </TooltipProvider>
      )}
    </>
  )
}
