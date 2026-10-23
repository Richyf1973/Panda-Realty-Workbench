"use client"

import { useCallback, useEffect, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@repo/ui/button"
import { PANDA_GOOGLE_CONTACTS_WARNING_EVENT } from "@/lib/google-contacts-warning-client"

/**
 * Listens for non-blocking Google Contacts sync warnings after admin PATCH responses.
 */
export function GoogleContactsSyncWarningBanner() {
  const [messages, setMessages] = useState<string[]>([])

  const onEvent = useCallback((e: Event) => {
    const ce = e as CustomEvent<unknown>
    const detail = ce.detail
    if (!Array.isArray(detail) || detail.length === 0) return
    const next = detail.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    if (next.length === 0) return
    setMessages((prev) => [...prev, ...next])
  }, [])

  useEffect(() => {
    window.addEventListener(PANDA_GOOGLE_CONTACTS_WARNING_EVENT, onEvent)
    return () => window.removeEventListener(PANDA_GOOGLE_CONTACTS_WARNING_EVENT, onEvent)
  }, [onEvent])

  if (messages.length === 0) return null

  return (
    <div
      data-testid="panda-google-contacts-warning-banner"
      className="pointer-events-auto fixed bottom-4 left-1/2 z-[200] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-amber-500/60 bg-amber-950/95 px-3 py-2 text-sm text-amber-50 shadow-lg dark:border-amber-400/50 dark:bg-amber-950/90"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-medium text-amber-100">Google Contacts</div>
          <ul className="list-disc space-y-0.5 pl-4 text-amber-50/95">
            {messages.map((m, i) => (
              <li key={`${i}-${m.slice(0, 24)}`} className="break-words">
                {m}
              </li>
            ))}
          </ul>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-amber-100 hover:bg-amber-900/80 hover:text-amber-50"
          aria-label="Dismiss Google Contacts notices"
          data-testid="panda-google-contacts-warning-banner-dismiss"
          onClick={() => setMessages([])}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
