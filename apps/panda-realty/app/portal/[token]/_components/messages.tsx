"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"

import { MAX_PORTAL_MESSAGE_CHARS, type PortalMessage } from "@/lib/portal-message-types"

export function PortalMessages({ token }: { token: string }) {
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}/messages`, { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json() as { messages: PortalMessage[] }
      setMessages(data.messages)
    } catch {
      // silently ignore network errors during poll
    }
  }, [token])

  // Initial fetch + polling with visibility pause
  useEffect(() => {
    void fetchMessages()

    function startPolling() {
      pollingRef.current = setInterval(() => {
        if (document.visibilityState === "visible") void fetchMessages()
      }, 30_000)
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") void fetchMessages()
    }

    startPolling()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [fetchMessages])

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || body.length > MAX_PORTAL_MESSAGE_CHARS || sending) return
    setSending(true)
    setSendError(null)

    const optimistic: PortalMessage = {
      portalMessageId: Date.now(),
      senderRole: "client",
      body,
      sentAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft("")

    try {
      const res = await fetch(`/api/portal/${token}/messages`, {
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

  const charCount = draft.length
  const overLimit = charCount > MAX_PORTAL_MESSAGE_CHARS
  const canSend = draft.trim().length > 0 && !overLimit && !sending

  return (
    <div data-testid="portal-messages" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-4 text-base font-semibold text-gray-800">Messages</p>

      {messages.length === 0 ? (
        <p data-testid="portal-messages-empty" className="mb-4 text-sm text-gray-500">
          No messages yet. Send a message to Richard below.
        </p>
      ) : (
        <div className="mb-4 flex max-h-80 flex-col gap-3 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.portalMessageId}
              data-testid="portal-message-bubble"
              className={`flex flex-col ${m.senderRole === "client" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.senderRole === "client"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.senderRole === "agent" && !m.readAt && (
                  <span
                    data-testid="portal-message-unread"
                    className="mb-1 block h-2 w-2 rounded-full bg-blue-500"
                    aria-label="Unread"
                  />
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-0.5 text-xs text-gray-400">
                {m.sentAt
                  ? formatDistanceToNow(new Date(m.sentAt), { addSuffix: true })
                  : "just now"}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {sendError && (
        <p className="mb-2 text-xs text-red-500">{sendError}</p>
      )}

      <div className="flex flex-col gap-2">
        <textarea
          data-testid="portal-messages-textarea"
          aria-label="Message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex items-center justify-between">
          <span
            data-testid="portal-messages-char-count"
            className={`text-xs ${overLimit ? "text-red-500" : "text-gray-400"}`}
          >
            {charCount} / {MAX_PORTAL_MESSAGE_CHARS}
          </span>
          <button
            data-testid="portal-messages-send-btn"
            type="button"
            disabled={!canSend}
            onClick={() => void send()}
            className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
