"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MessageSquare } from "lucide-react"

import { Button } from "@repo/ui/button"

import { PortalMessageThread, type ThreadInfo } from "./portal-message-thread"

export type InlineMessageToken = { portalTokenId: number; revokedAt: string | null }

interface InlinePortalMessagesProps {
  buttonTestId: string
  unreadTestId: string
  panelTestId: string
  label?: string
  /** Override the button height/spacing so it matches its neighbouring buttons (defaults to the portal-button height). */
  buttonClassName?: string
  /** Token known synchronously (e.g. the seller panel's active token). Drives the unread prefetch and immediate open. */
  initialToken?: InlineMessageToken | null
  /** Fetch the existing token for the unread prefetch when it is not known up front (GET only, never creates). */
  loadToken?: () => Promise<InlineMessageToken | null>
  /** Resolve-or-create the token when the thread is first opened (auto-generates when none exists). */
  ensureToken: () => Promise<InlineMessageToken | null>
  /** Deep link: open the thread automatically on mount (e.g. arriving from a notification email link). */
  autoOpen?: boolean
}

/**
 * A Messages button (with unread dot) that toggles the shared PortalMessageThread inline below the button row.
 * The panel uses `basis-full w-full` so it wraps onto its own line inside a `flex-wrap` button row.
 */
export function InlinePortalMessages({
  buttonTestId,
  unreadTestId,
  panelTestId,
  label = "Messages",
  buttonClassName = "h-11 sm:h-9",
  initialToken,
  loadToken,
  ensureToken,
  autoOpen = false,
}: InlinePortalMessagesProps) {
  const [open, setOpen] = useState(autoOpen)
  const [threadInfo, setThreadInfo] = useState<ThreadInfo>(initialToken === undefined ? "loading" : initialToken)
  const [resolving, setResolving] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const initialTokenId = initialToken?.portalTokenId ?? null
  const initialRevoked = initialToken?.revokedAt ?? null

  // Keep threadInfo in step with a synchronously-known token that may arrive/refresh after mount.
  useEffect(() => {
    if (initialToken !== undefined && !open) setThreadInfo(initialToken)
  }, [initialTokenId, initialRevoked, initialToken, open])

  // Prefetch the unread indicator on mount using peek mode (does not mark messages read).
  useEffect(() => {
    let cancelled = false
    async function prefetch() {
      let token: InlineMessageToken | null | undefined = initialToken
      if (token === undefined && loadToken) token = await loadToken()
      if (cancelled || !token || token.revokedAt) return
      try {
        const res = await fetch(`/api/admin/portal-messages/${token.portalTokenId}?peek=1`)
        if (!res.ok) return
        const data = (await res.json()) as { messages: Array<{ senderRole: string; readAt: string | null }> }
        if (!cancelled) setHasUnread(data.messages.some((m) => m.senderRole === "client" && !m.readAt))
      } catch {
        // unread indicator is best-effort
      }
    }
    void prefetch()
    return () => { cancelled = true }
  }, [initialTokenId, initialRevoked, loadToken])

  const handleToggle = useCallback(async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (threadInfo === "loading" || threadInfo == null) {
      setResolving(true)
      try {
        const token = await ensureToken()
        setThreadInfo(token ?? null)
      } finally {
        setResolving(false)
      }
    }
  }, [open, threadInfo, ensureToken])

  // Deep link: when arriving from a notification link (autoOpen), open the thread on mount, resolve
  // the token if it isn't known yet, and scroll it into view. No "ran once" ref guard — under React
  // StrictMode the effect mounts twice; the `cancelled` flag makes each run self-contained so the
  // second (real) mount always completes the resolve (a ref guard would skip it and wedge "Loading…").
  useEffect(() => {
    if (!autoOpen) return
    setOpen(true)
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }))
    if (threadInfo !== "loading" && threadInfo != null) return
    let cancelled = false
    setResolving(true)
    void ensureToken()
      .then((token) => { if (!cancelled) setThreadInfo(token ?? null) })
      .finally(() => { if (!cancelled) setResolving(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount when autoOpen is set
  }, [autoOpen])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`relative ${buttonClassName}`}
        aria-expanded={open}
        aria-controls={panelTestId}
        data-testid={buttonTestId}
        onClick={() => void handleToggle()}
      >
        <MessageSquare className="h-4 w-4" />
        {label}
        {hasUnread && (
          <span
            data-testid={unreadTestId}
            aria-label="Unread message"
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500"
          />
        )}
      </Button>

      {open && (
        <div ref={panelRef} id={panelTestId} data-testid={panelTestId} className="mt-2 w-full basis-full">
          <PortalMessageThread
            threadInfo={resolving ? "loading" : threadInfo}
            onUnreadChange={setHasUnread}
            noTokenMessage="Couldn't open the message thread. Please try again."
          />
        </div>
      )}
    </>
  )
}
