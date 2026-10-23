"use client"

import type { EntityThreadForwardDraft, EntityThreadReplyDraft } from "./entity-threads-panel"
import { EntityCardRow } from "./property-entity-card-row"
import type { PropertyContact } from "./property-contact-types"

export function ContactRow({
  contact: c,
  propertyListId,
  onCompose,
  onReply,
  onForward,
  onAddEvent,
  onAddNote,
  onAddReminder,
  onFiles,
  onEdit,
  onDelete,
}: {
  contact: PropertyContact
  propertyListId?: number | null
  onCompose?: (email: string, entityName: string) => void
  onReply?: (draft: EntityThreadReplyDraft) => void
  onForward?: (draft: EntityThreadForwardDraft) => void
  onAddEvent?: () => void
  onAddNote?: () => void
  onAddReminder?: () => void
  onFiles?: () => void
  onEdit: (c: PropertyContact) => void
  onDelete: (c: PropertyContact) => void
}) {
  const subLine =
    c.contactCategoryName || c.association ? (
      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
        {c.contactCategoryName && <span>{c.contactCategoryName}</span>}
        {c.contactCategoryName && c.association && <span>·</span>}
        {c.association && <span>{c.association}</span>}
      </div>
    ) : undefined

  return (
    <EntityCardRow
      propertyEntityId={c.propertyEntityId}
      entityId={c.entityId}
      entityName={c.entityName ?? ""}
      phoneNumber={c.phoneNumber}
      emailAddress={c.emailAddress}
      address={c.address}
      subLine={subLine}
      testidPrefix="property-contact"
      propertyListId={propertyListId}
      onCompose={onCompose}
      onReply={onReply}
      onForward={onForward}
      onAddEvent={onAddEvent}
      onAddNote={onAddNote}
      onAddReminder={onAddReminder}
      onFiles={onFiles}
      onEdit={() => onEdit(c)}
      onDelete={() => onDelete(c)}
    />
  )
}
