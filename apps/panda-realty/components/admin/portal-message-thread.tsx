"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@repo/ui/button"

import { MAX_PORTAL_MESSAGE_CHARS, type PortalMessage } from "@/lib/portal-message-types"

export type ThreadInfo =
  | { portalTokenId: number; revokedAt: string | null }
  | null
  | "loading"

interface PortalMessageThreadProps {
  threadInfo: ThreadInfo
  onUnreadChange?: (hasUnread: boolean) => void
  noTokenMessage?: string
}

export function PortalMessageThread({ threadInfo, onUnreadChange, noTokenMessage }: PortalMessageThreadProps) {
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onUnreadChangeRef = useRef(onUnreadChange)
  onUnreadChangeRef.current = onUnreadChange

  const portalTokenId =
    threadInfo !== "loading" && threadInfo !== null ? threadInfo.portalTokenId : null

  const fetchMessages = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/admin/portal-messages/${id}`)
      if (!res.ok) return
      const data = await res.json() as { messages: PortalMessage[] }
      setMessages(data.messages)
      const unread = data.messages.some((m) => m.senderRole === "client" && !m.readAt)
      onUnreadChangeRef.current?.(unread)
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    setMessages([])
    setDraft("")
    setSendError(null)
    if (pollingRef.current) clearInterval(pollingRef.current)

    if (!portalTokenId) return

    void fetchMessages(portalTokenId)

    function handleVisibility() {
      if (document.visibilityState === "visible" && portalTokenId) void fetchMessages(portalTokenId)
    }

    pollingRef.current = setInterval(() => {
      if (document.visibilityState === "visible" && portalTokenId) void fetchMessages(portalTokenId)
    }, 30_000)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [portalTokenId, fetchMessages])

  // Keep the thread pinned to the newest message — but only the inner list, and only when a
  // message is actually added. scrollIntoView() would bubble up and scroll the surrounding
  // property dialog; setting scrollTop on the list itself stays local. Gating on a count
  // increase stops the 30s poll (which hands back a fresh array of identical messages) from
  // yanking the dialog on its own.
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    prevCountRef.current = messages.length
  }, [messages])

  async function send() {
    if (!portalTokenId) return
    const body = draft.trim()
    if (!body || body.length > MAX_PORTAL_MESSAGE_CHARS || sending) return
    setSending(true)
    setSendError(null)

    const optimistic: PortalMessage = {
      portalMessageId: Date.now(),
      senderRole: "agent",
      body,
      sentAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft("")

    try {
      const res = await fetch(`/api/admin/portal-messages/${portalTokenId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        const saved = await res.json() as PortalMessage
        setMessages((prev) =>
          prev.map((m) => (m.portalMessageId === optimistic.portalMessageId ? saved : m)),
        )
      } else {
        setMessages((prev) => prev.filter((m) => m.portalMessageId !== optimistic.portalMessageId))
        setSendError("Failed to send. Please try again.")
        setDraft(body)
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.portalMessageId !== optimistic.portalMessageId))
      setSendError("Failed to send. Please try again.")
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void send()
    }
  }

  if (threadInfo === "loading") {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!threadInfo) {
    return (
      <p className="text-sm text-muted-foreground">
        {noTokenMessage ?? "Generate a portal link first to enable messaging."}
      </p>
    )
  }

  if (threadInfo.revokedAt) {
    return (
      <p className="text-sm text-muted-foreground">
        This portal link has been revoked. Messaging is unavailable.
      </p>
    )
  }

  const charCount = draft.length
  const overLimit = charCount > MAX_PORTAL_MESSAGE_CHARS
  const canSend = draft.trim().length > 0 && !overLimit && !sending

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <p data-testid="portal-message-panel-empty" className="text-sm text-muted-foreground">
          No messages yet. Your client hasn&apos;t sent a message.
        </p>
      ) : (
        <div ref={listRef} className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border bg-muted/30 p-3">
          {messages.map((m) => (
            <div
              key={m.portalMessageId}
              data-testid="portal-message-bubble"
              className={`flex flex-col ${m.senderRole === "agent" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.senderRole === "agent"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                {m.senderRole === "client" && !m.readAt && (
                  <span
                    data-testid="portal-message-unread"
                    className="mb-1 block h-2 w-2 rounded-full bg-blue-500"
                    aria-label="Unread"
                  />
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {m.sentAt
                  ? formatDistanceToNow(new Date(m.sentAt), { addSuffix: true })
                  : "just now"}
              </span>
            </div>
          ))}
        </div>
      )}

      {sendError && <p className="text-xs text-destructive">{sendError}</p>}

      <div className="flex flex-col gap-1.5">
        <textarea
          data-testid="portal-message-panel-textarea"
          aria-label="Reply"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a reply…"
          rows={3}
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center justify-between">
          <span
            data-testid="portal-message-panel-char-count"
            className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}
          >
            {charCount} / {MAX_PORTAL_MESSAGE_CHARS}
          </span>
          <Button
            type="button"
            size="sm"
            data-testid="portal-message-panel-send-btn"
            disabled={!canSend}
            onClick={() => void send()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

export function hasUnreadMessages(messages: PortalMessage[]): boolean {
  return messages.some((m) => m.senderRole === "client" && !m.readAt)
}
