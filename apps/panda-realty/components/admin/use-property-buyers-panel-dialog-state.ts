"use client"

import { useState } from "react"

import type { EntityThreadForwardDraft, EntityThreadReplyDraft } from "./entity-threads-panel"
import type { GmailForwardContext } from "./gmail-compose-dialog"

export interface ComposeDialogState {
  open: boolean
  email: string
  entityName: string
  subject: string
  body: string
  replyContext?: { threadId: string; messageId: string }
}

interface MeetingDialogState {
  open: boolean
  defaultTitle: string
  defaultBuyerId: number | null
}

interface AddNoteDialogState {
  open: boolean
  propertyEntityId: number | null
  entityName: string
}

interface ReminderDialogState {
  open: boolean
  defaultBuyerId: number | null
}

interface EntityDialogState {
  open: boolean
  propertyEntityId: number | null
  entityName: string
}

const CLOSED_COMPOSE: ComposeDialogState = { open: false, email: "", entityName: "", subject: "", body: "" }
const CLOSED_ENTITY: EntityDialogState = { open: false, propertyEntityId: null, entityName: "" }

export function usePropertyBuyersPanelDialogState(propertyAddress: string) {
  const [composeDialog, setComposeDialog] = useState<ComposeDialogState>(CLOSED_COMPOSE)
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)
  const [meetingDialog, setMeetingDialog] = useState<MeetingDialogState>({
    open: false,
    defaultTitle: "",
    defaultBuyerId: null,
  })
  const [addNoteDialog, setAddNoteDialog] = useState<AddNoteDialogState>({
    open: false,
    propertyEntityId: null,
    entityName: "",
  })
  const [reminderDialog, setReminderDialog] = useState<ReminderDialogState>({
    open: false,
    defaultBuyerId: null,
  })
  const [offersDialog, setOffersDialog] = useState<EntityDialogState>(CLOSED_ENTITY)
  const [filesDialog, setFilesDialog] = useState<EntityDialogState>(CLOSED_ENTITY)

  function openNewCompose(email: string, entityName: string) {
    setComposeDialog({ open: true, email, entityName, subject: propertyAddress, body: `Dear ${entityName},\n\n` })
  }

  function openReplyCompose(entityName: string, draft: EntityThreadReplyDraft) {
    setComposeDialog({
      open: true,
      email: draft.to,
      entityName,
      subject: draft.subject,
      body: `Dear ${entityName},\n\n`,
      replyContext: { threadId: draft.threadId, messageId: draft.messageId },
    })
  }

  function openForwardCompose(draft: EntityThreadForwardDraft) {
    setForwardDraft({
      messageId: draft.messageId,
      from: draft.from,
      date: draft.date,
      subject: draft.subject,
      body: draft.body,
      attachments: draft.attachments,
    })
  }

  function closeForwardCompose() {
    setForwardDraft(null)
  }

  return {
    composeDialog,
    setComposeDialog,
    openNewCompose,
    openReplyCompose,
    forwardDraft,
    openForwardCompose,
    closeForwardCompose,
    meetingDialog,
    setMeetingDialog,
    addNoteDialog,
    setAddNoteDialog,
    reminderDialog,
    setReminderDialog,
    offersDialog,
    setOffersDialog,
    filesDialog,
    setFilesDialog,
  }
}
