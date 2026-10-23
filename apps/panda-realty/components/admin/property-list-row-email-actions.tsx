"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"
import { GmailComposeDialog, type GmailForwardContext } from "./gmail-compose-dialog"
import type { PropertyRowActionControls } from "./property-list-row-action-controls"

interface PropertyListRowEmailDialogsProps {
  controls: PropertyRowActionControls
  propertyListId: number
  owner1name: string | null
  owner1email: string | null
  composeSubject: string
}

/**
 * Owner email dialogs (compose + threads) for a property list row. The trigger controls live in the
 * collapsible action descriptors; this component only mounts the dialogs and binds its open handlers
 * onto the shared {@link PropertyRowActionControls} so the descriptors can open them.
 */
export function PropertyListRowEmailDialogs({
  controls,
  propertyListId,
  owner1name,
  owner1email,
  composeSubject,
}: PropertyListRowEmailDialogsProps) {
  const [composeOpen, setComposeOpen] = useState(false)
  const [threadDialogOpen, setThreadDialogOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState<EntityThreadReplyDraft | null>(null)
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)

  controls.openOwnerCompose = () => {
    if (owner1email) setComposeOpen(true)
  }
  controls.openOwnerInbox = () => {
    if (owner1email) setThreadDialogOpen(true)
  }

  return (
    <>
      {composeOpen && owner1email ? (
        <GmailComposeDialog
          key={`property-row-${propertyListId}-${owner1email}`}
          open={composeOpen}
          to={owner1email}
          subject={composeSubject}
          body={`Dear ${owner1name ?? ""},\n\n`}
          propertyListId={propertyListId}
          onClose={() => setComposeOpen(false)}
        />
      ) : null}

      <Dialog open={threadDialogOpen} onOpenChange={setThreadDialogOpen}>
        <DialogContent
          data-testid={`property-list-inbox-dialog--${propertyListId}`}
          className="sm:max-w-4xl flex flex-col max-h-[85vh]"
        >
          <DialogHeader>
            <DialogTitle>Email threads — {owner1name}</DialogTitle>
          </DialogHeader>
          {owner1email ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EntityThreadsPanel
                email={owner1email}
                onReply={(draft) => {
                  setReplyDraft(draft)
                  setThreadDialogOpen(false)
                }}
                onForward={(draft: EntityThreadForwardDraft) => {
                  setForwardDraft({
                    messageId: draft.messageId,
                    from: draft.from,
                    date: draft.date,
                    subject: draft.subject,
                    body: draft.body,
                    attachments: draft.attachments,
                  })
                  setThreadDialogOpen(false)
                }}
                propertyListId={propertyListId}
                entityName={owner1name ?? null}
                ownerNum={1}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {replyDraft ? (
        <GmailComposeDialog
          key={`property-row-reply-${propertyListId}-${replyDraft.messageId}`}
          open={replyDraft !== null}
          to={replyDraft.to}
          subject={replyDraft.subject}
          body=""
          propertyListId={propertyListId}
          replyContext={{ threadId: replyDraft.threadId, messageId: replyDraft.messageId }}
          onClose={() => setReplyDraft(null)}
        />
      ) : null}
      {forwardDraft ? (
        <GmailComposeDialog
          key={`property-row-forward-${propertyListId}-${forwardDraft.messageId}`}
          open={true}
          to=""
          subject=""
          body=""
          propertyListId={propertyListId}
          forwardContext={forwardDraft}
          onClose={() => setForwardDraft(null)}
        />
      ) : null}
    </>
  )
}
