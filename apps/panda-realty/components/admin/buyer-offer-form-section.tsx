"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Copy, Send } from "lucide-react"

import { Button } from "@repo/ui/button"

import { BuyerOfferSubmissionPanel, type Submission } from "./buyer-offer-submission-panel"

interface BuyerOfferFormSectionProps {
  propertyEntityId: number
}

export function BuyerOfferFormSection({ propertyEntityId }: BuyerOfferFormSectionProps) {
  const [formUrl, setFormUrl] = useState<string | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [hasEmail, setHasEmail] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [entityEmail, setEntityEmail] = useState<string | null>(null)
  const [showSubmission, setShowSubmission] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/property-entities/${propertyEntityId}/offer-form-status`)
      if (!res.ok) return
      const data = (await res.json()) as {
        formUrl: string
        entityEmail: string | null
        submission: Submission | null
      }
      setFormUrl(data.formUrl)
      setEntityEmail(data.entityEmail)
      setHasEmail(!!data.entityEmail)
      setSubmission(data.submission)
    } finally {
      setLoading(false)
    }
  }, [propertyEntityId])

  useEffect(() => { void load() }, [load])

  const handleCopy = useCallback(async () => {
    if (!formUrl) return
    try {
      await navigator.clipboard.writeText(formUrl)
      setCopied(true)
      setCopyError(null)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError("Could not copy — please select and copy the URL manually")
    }
  }, [formUrl])

  const handleSend = useCallback(async () => {
    setSending(true)
    setSendError(null)
    setSendSuccess(false)
    try {
      const res = await fetch(`/api/admin/property-entities/${propertyEntityId}/offer-form-send`, {
        method: "POST",
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        setSendError(d.error ?? "Failed to send email")
      } else {
        setSendSuccess(true)
        setTimeout(() => setSendSuccess(false), 4000)
      }
    } finally {
      setSending(false)
    }
  }, [propertyEntityId])

  if (loading) {
    return (
      <div
        className="mb-4 rounded-md border p-3 text-sm text-muted-foreground"
        data-testid={`buyer-offer-form-section--${propertyEntityId}`}
      >
        Loading offer form…
      </div>
    )
  }

  const submittedDate = submission?.submittedAt
    ? new Date(submission.submittedAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div
      className="mb-4 rounded-md border p-3 space-y-2"
      data-testid={`buyer-offer-form-section--${propertyEntityId}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Offer Form</p>

      <div className="flex items-center gap-2">
        <a
          href={formUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate rounded border bg-muted px-2 py-1 text-xs font-mono underline-offset-2 hover:underline"
          data-testid={`buyer-offer-form-url--${propertyEntityId}`}
        >
          {formUrl ?? ""}
        </a>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          data-testid={`buyer-offer-form-copy--${propertyEntityId}`}
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSend}
          disabled={!hasEmail || sending}
          title={!hasEmail ? "No email address on file" : entityEmail ? `Send to ${entityEmail}` : undefined}
          data-testid={`buyer-offer-form-send--${propertyEntityId}`}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>

      {sendError && <p className="text-xs text-destructive">{sendError}</p>}
      {sendSuccess && (
        <p className="text-xs text-green-600">✓ Email sent{entityEmail ? ` to ${entityEmail}` : ""}</p>
      )}
      {copyError && <p className="text-xs text-destructive">{copyError}</p>}

      <div
        className="flex items-center gap-2 text-xs"
        data-testid={`buyer-offer-form-status--${propertyEntityId}`}
      >
        {submission ? (
          <>
            <span className="text-green-600">✓ Submitted {submittedDate}</span>
            <button
              type="button"
              className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSubmission((v) => !v)}
              data-testid={`buyer-offer-form-view-submission--${propertyEntityId}`}
            >
              View Submission {showSubmission ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </>
        ) : (
          <span className="text-muted-foreground">● Not yet submitted</span>
        )}
      </div>

      {showSubmission && submission && (
        <BuyerOfferSubmissionPanel submission={submission} propertyEntityId={propertyEntityId} />
      )}
    </div>
  )
}
