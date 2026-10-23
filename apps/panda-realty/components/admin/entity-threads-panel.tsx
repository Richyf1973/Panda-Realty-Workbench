"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { GmailAttachment, GmailThread } from "@/lib/gmail-client"
import { GmailThreadList } from "./gmail-thread-row"

export interface EntityThreadReplyDraft {
  threadId: string
  messageId: string
  to: string
  subject: string
}

export interface EntityThreadForwardDraft {
  messageId: string
  from: string
  date: string
  subject: string
  body: string
  attachments: GmailAttachment[]
}

export function EntityThreadsPanel({
  email,
  entityId,
  onReply,
  onForward,
  propertyListId,
  propertyEntityId,
  entityName,
  ownerNum,
}: {
  email?: string
  entityId?: number | null
  onReply?: (draft: EntityThreadReplyDraft) => void
  onForward?: (draft: EntityThreadForwardDraft) => void
  propertyListId?: number | null
  propertyEntityId?: number | null
  entityName?: string | null
  ownerNum?: 1 | 2 | 3
}) {
  const [threads, setThreads] = useState<GmailThread[]>([])
  const [hiddenCount, setHiddenCount] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const showAllRef = useRef(false)
  const toggleControllerRef = useRef<AbortController | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetched = useRef(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    let url: string | null
    if (entityId != null && propertyListId) {
      url = `/api/admin/gmail/threads-by-entity?entityId=${entityId}&propertyListId=${propertyListId}&showAll=${showAllRef.current}`
    } else if (propertyListId) {
      const peParam = propertyEntityId != null ? `&propertyEntityId=${propertyEntityId}` : ""
      url = `/api/admin/gmail/property-contact-threads?email=${encodeURIComponent(email ?? "")}&propertyListId=${propertyListId}&showAll=${showAllRef.current}${peParam}`
    } else if (entityId != null) {
      url = `/api/admin/gmail/threads-by-entity?entityId=${entityId}`
    } else if (email?.trim()) {
      url = `/api/admin/gmail/threads?email=${encodeURIComponent(email.trim())}`
    } else {
      url = null
    }
    if (!url) {
      setThreads([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Failed to load email threads — please try again")
      }
      const data = (await res.json()) as { threads?: GmailThread[]; hiddenCount?: number }
      setThreads(Array.isArray(data.threads) ? data.threads : [])
      setHiddenCount(data.hiddenCount ?? 0)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Failed to load email threads — please try again")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [email, propertyListId, entityId])

  useEffect(() => {
    fetched.current = false
    showAllRef.current = false
    setShowAll(false)
    setHiddenCount(0)
  }, [email, propertyListId, entityId])

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  function handleToggleShowAll() {
    toggleControllerRef.current?.abort()
    const next = !showAll
    showAllRef.current = next
    setShowAll(next)
    const controller = new AbortController()
    toggleControllerRef.current = controller
    void load(controller.signal)
  }

  return (
    <div
      className="mt-1 rounded-md border bg-muted/30 px-3 py-3"
      data-testid="entity-threads-panel"
    >
      <GmailThreadList
        threads={threads}
        loading={loading}
        error={error}
        email={email?.trim() || entityName || "this contact"}
        onRefresh={load}
        onReply={onReply}
        onForward={onForward}
        propertyListId={propertyListId}
        propertyEntityId={propertyEntityId}
        entityName={entityName}
        ownerNum={ownerNum}
      />
      {!loading && !error && propertyListId && (hiddenCount > 0 || showAll) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {showAll ? (
            <>
              Showing all threads &middot;{" "}
              <button
                type="button"
                className="underline hover:no-underline"
                onClick={handleToggleShowAll}
              >
                Filter to this property
              </button>
            </>
          ) : (
            <>
              {hiddenCount} older {hiddenCount === 1 ? "thread" : "threads"} hidden &middot;{" "}
              <button
                type="button"
                className="underline hover:no-underline"
                onClick={handleToggleShowAll}
              >
                Show all
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}
