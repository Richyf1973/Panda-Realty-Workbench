"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Mail, Paperclip } from "lucide-react"

import { Button } from "@repo/ui/button"

import type { GmailThread, GmailThreadMessage } from "@/lib/gmail-client"
import { decodeHtmlEntities } from "@/lib/html-utils"
import { MessageBlock, type ForwardDraftPayload } from "./gmail-message-block"
import { formatThreadDate } from "./gmail-thread-utilities"

export function GmailThreadRow({
  thread,
  onReply,
  onForward,
  propertyListId,
  propertyEntityId,
  entityName,
  ownerNum,
}: {
  thread: GmailThread
  onReply?: (draft: { threadId: string; messageId: string; to: string; subject: string }) => void
  onForward?: (draft: ForwardDraftPayload) => void
  propertyListId?: number | null
  propertyEntityId?: number | null
  entityName?: string | null
  ownerNum?: 1 | 2 | 3
}) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<GmailThreadMessage[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (messages !== null) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/gmail/threads/body?threadId=${encodeURIComponent(thread.threadId)}`)
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Failed to load body (${res.status})`)
      }
      const data = (await res.json()) as { messages?: GmailThreadMessage[] }
      setMessages(Array.isArray(data.messages) ? data.messages : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load message body.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <li className="rounded-md border bg-card">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
        onClick={handleExpand}
        data-testid="gmail-thread-row"
      >
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">{thread.subject}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {thread.attachmentCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5"
                  data-testid={`gmail-thread-attachment-count--${thread.threadId}`}
                  aria-label={`${thread.attachmentCount} attachments`}
                >
                  <Paperclip className="h-3 w-3" />
                  {thread.attachmentCount}
                </span>
              )}
              <span>{formatThreadDate(thread.date)}</span>
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{thread.from}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{decodeHtmlEntities(thread.snippet)}</p>
        </div>
        <div className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="max-h-[60vh] overflow-y-auto scrollbar-galaxy border-t text-sm">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          ) : error ? (
            <p className="px-3 py-3 text-xs text-destructive">{error}</p>
          ) : messages && messages.length > 0 ? (
            <div className="flex flex-col">
              {messages.map((m) => (
                <MessageBlock
                  key={m.messageId}
                  threadId={thread.threadId}
                  message={m}
                  onReply={onReply}
                  onForward={onForward}
                  propertyListId={propertyListId}
                  propertyEntityId={propertyEntityId}
                  entityName={entityName}
                  ownerNum={ownerNum}
                />
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-xs text-muted-foreground">(empty)</p>
          )}
        </div>
      )}
    </li>
  )
}

export function GmailThreadList({
  threads,
  loading,
  error,
  email,
  onRefresh,
  onReply,
  onForward,
  propertyListId,
  propertyEntityId,
  entityName,
  ownerNum,
}: {
  threads: GmailThread[]
  loading: boolean
  error: string | null
  email: string
  onRefresh?: () => void
  onReply?: (draft: { threadId: string; messageId: string; to: string; subject: string }) => void
  onForward?: (draft: ForwardDraftPayload) => void
  propertyListId?: number | null
  propertyEntityId?: number | null
  entityName?: string | null
  ownerNum?: 1 | 2 | 3
}) {
  if (loading) {
    return (
      <div className="flex h-20 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-destructive">{error}</p>
        {onRefresh && (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} className="self-start">
            Retry
          </Button>
        )}
      </div>
    )
  }

  if (threads.length === 0) {
    return <p className="text-sm text-muted-foreground">No threads found for {email}.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {threads.map((t) => (
        <GmailThreadRow
          key={t.threadId}
          thread={t}
          onReply={onReply}
          onForward={onForward}
          propertyListId={propertyListId}
          propertyEntityId={propertyEntityId}
          entityName={entityName}
          ownerNum={ownerNum}
        />
      ))}
    </ul>
  )
}
