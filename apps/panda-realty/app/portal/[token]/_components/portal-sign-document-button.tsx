"use client"

import { useState } from "react"
import { PenLine } from "lucide-react"

export function PortalSignDocumentButton({
  token,
  driveFileId,
  fileName,
}: {
  token: string
  driveFileId: string
  fileName?: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/portal/${token}/sign-url/${driveFileId}`)
      if (!res.ok) throw new Error("non-200")
      const data = (await res.json()) as { url: string }
      window.open(data.url, "_blank", "noopener,noreferrer")
      setError("Reload this page after signing to see the updated status")
    } catch {
      setError("Couldn't load signing link, try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        data-testid={`portal-sign-document-btn--${driveFileId}`}
        aria-label={`Sign ${fileName ?? "document"}`}
        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-inset ring-amber-300 hover:bg-amber-100 disabled:opacity-60"
      >
        <PenLine className="size-3.5" aria-hidden />
        {loading ? "Loading…" : "Sign document"}
      </button>
      {error && (
        <p
          data-testid={`portal-sign-error--${driveFileId}`}
          className="mt-1 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  )
}
