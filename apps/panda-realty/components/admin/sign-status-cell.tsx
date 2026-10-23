"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"

export interface SharedFile {
  driveFileId: string
  fileName: string | null
  signatureStatus: string | null
  signRequestId: number | null
  signedAt: string | null
}

export interface SignStatusCellProps {
  file: SharedFile
  onSend: (driveFileId: string) => void
  onResend: (signRequestId: number) => void
  onCancelRequest: (signRequestId: number, driveFileId: string) => void
  sending: Set<string>
  reminding: Set<number>
}

export function formatSignedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function SignStatusCell({
  file,
  onSend,
  onResend,
  onCancelRequest,
  sending,
  reminding,
}: SignStatusCellProps) {
  const { driveFileId, signatureStatus, signRequestId, signedAt } = file

  if (signatureStatus === "signed") {
    return (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          data-testid={`portal-signed-badge--${driveFileId}`}
          className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          Signed
        </span>
        {signedAt && (
          <span
            data-testid={`portal-signed-at--${driveFileId}`}
            className="text-[11px] text-muted-foreground"
          >
            {formatSignedAt(signedAt)}
          </span>
        )}
      </div>
    )
  }

  if (signatureStatus === "cancelled") {
    return (
      <span
        data-testid={`portal-cancelled-badge--${driveFileId}`}
        className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
      >
        Cancelled
      </span>
    )
  }

  if (signatureStatus === "pending" && signRequestId != null) {
    const isReminding = reminding.has(signRequestId)
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span
          data-testid={`portal-awaiting-signature-badge--${driveFileId}`}
          className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        >
          Awaiting signature
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid={`portal-resend-btn--${driveFileId}`}
          aria-label={`Resend reminder for ${file.fileName ?? "this document"}`}
          disabled={isReminding}
          onClick={() => onResend(signRequestId)}
          className="h-7 px-2 text-xs"
        >
          {isReminding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-testid={`portal-cancel-btn--${driveFileId}`}
          aria-label={`Cancel signing request for ${file.fileName ?? "this document"}`}
          disabled={isReminding}
          onClick={() => onCancelRequest(signRequestId, driveFileId)}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      data-testid={`portal-send-for-signature-btn--${driveFileId}`}
      disabled={sending.has(driveFileId)}
      onClick={() => onSend(driveFileId)}
    >
      {sending.has(driveFileId) ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending…
        </>
      ) : (
        "Send for signature"
      )}
    </Button>
  )
}
