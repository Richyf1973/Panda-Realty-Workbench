"use client"

import { useState } from "react"

import type { ComposeDialogState } from "./use-property-buyers-panel-dialog-state"
import type { EntityThreadForwardDraft, EntityThreadReplyDraft } from "./entity-threads-panel"
import type { GmailForwardContext } from "./gmail-compose-dialog"

const CLOSED_COMPOSE: ComposeDialogState = { open: false, email: "", entityName: "", subject: "", body: "" }

export function useEntityPanelComposeDialog(propertyAddress: string) {
  const [composeDialog, setComposeDialog] = useState<ComposeDialogState>(CLOSED_COMPOSE)
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)

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

  return { composeDialog, setComposeDialog, openNewCompose, openReplyCompose, forwardDraft, openForwardCompose, closeForwardCompose }
}
