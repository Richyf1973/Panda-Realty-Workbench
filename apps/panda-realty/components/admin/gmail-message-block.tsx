"use client"

import { Button } from "@repo/ui/button"

import type { GmailAttachment, GmailThreadMessage } from "@/lib/gmail-client"
import { extractEmailAddress, normalizeForwardSubject, normalizeReplySubject } from "@/lib/gmail-reply"
import { AttachmentRow } from "./gmail-attachment-row"
import { formatThreadDate, renderBodyWithLinks } from "./gmail-thread-utilities"

export type ForwardDraftPayload = {
  messageId: string
  from: string
  date: string
  subject: string
  body: string
  attachments: GmailAttachment[]
}

export function MessageBlock({
  threadId,
  message,
  onReply,
  onForward,
  propertyListId,
  propertyEntityId,
  entityName,
  ownerNum,
}: {
  threadId: string
  message: GmailThreadMessage
  onReply?: (draft: { threadId: string; messageId: string; to: string; subject: string }) => void
  onForward?: (draft: ForwardDraftPayload) => void
  propertyListId?: number | null
  propertyEntityId?: number | null
  entityName?: string | null
  ownerNum?: 1 | 2 | 3
}) {
  const replyToEmail = extractEmailAddress(message.from)
  const canReply = Boolean(replyToEmail && onReply)

  return (
    <div
      className="border-t px-3 py-3 first:border-t-0"
      data-testid={`gmail-thread-message--${message.messageId}`}
    >
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {message.from || "(unknown sender)"} · {formatThreadDate(message.date) || "(no date)"}
      </div>
      <pre className="max-h-96 overflow-y-auto scrollbar-galaxy whitespace-pre-wrap wrap-break-word font-sans text-xs leading-relaxed text-foreground">
        {message.body ? renderBodyWithLinks(message.body) : "(empty)"}
      </pre>
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!onForward}
          data-testid={`gmail-thread-forward--${message.messageId}`}
          onClick={() => {
            if (!onForward) return
            onForward({
              messageId: message.messageId,
              from: message.from,
              date: message.date,
              subject: normalizeForwardSubject(message.subject),
              body: message.body,
              attachments: message.attachments,
            })
          }}
        >
          Forward
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canReply}
          data-testid={`gmail-thread-reply--${message.messageId}`}
          onClick={() => {
            if (!replyToEmail || !onReply) return
            onReply({
              threadId,
              messageId: message.messageId,
              to: replyToEmail,
              subject: normalizeReplySubject(message.subject),
            })
          }}
        >
          Reply
        </Button>
      </div>
      {message.attachments.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Attachments
          </div>
          {message.attachments.map((att) => (
            <AttachmentRow
              key={att.attachmentId}
              att={att}
              propertyListId={propertyListId}
              propertyEntityId={propertyEntityId}
              entityName={entityName}
              ownerNum={ownerNum}
            />
          ))}
        </div>
      )}
    </div>
  )
}
