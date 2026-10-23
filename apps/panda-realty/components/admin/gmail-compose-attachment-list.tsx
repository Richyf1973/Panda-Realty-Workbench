"use client"

import type React from "react"
import { AlertCircle, CheckCircle2, Loader2, Paperclip, RefreshCw, X } from "lucide-react"

import { Button } from "@repo/ui/button"

import type { AttachmentChipItem } from "./gmail-compose-dialog"

// ~14.5 MB raw ≈ 20 MB after base64 encoding — stays safely under Gmail's 25 MB limit
export const MAX_ATTACHMENT_BYTES = Math.floor(14.5 * 1024 * 1024)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface GmailComposeAttachmentListProps {
  chips: AttachmentChipItem[]
  totalAttachmentBytes: number
  attachmentSizeExceeded: boolean
  sending: boolean
  attachFileInputRef: React.RefObject<HTMLInputElement | null>
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveChip: (id: string) => void
  onRetryChip: (id: string) => void
}

export function GmailComposeAttachmentList({
  chips,
  totalAttachmentBytes,
  attachmentSizeExceeded,
  sending,
  attachFileInputRef,
  onFileInputChange,
  onRemoveChip,
  onRetryChip,
}: GmailComposeAttachmentListProps) {
  return (
    <div className="flex flex-col gap-2">
      {chips.length > 0 && (
        <div className="flex flex-col gap-1">
          {chips.map((chip) => (
            <div
              key={chip.id}
              className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
              data-testid="property-gmail-compose-attachment-chip"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

              <span className="min-w-0 flex-1 truncate">
                {chip.status === "gmail" ? chip.filename : chip.file.name}
              </span>

              {chip.status === "gmail" && (
                <div
                  className="flex shrink-0 items-center gap-1.5 text-muted-foreground"
                  data-testid="property-gmail-compose-attachment-gmail"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs">{formatFileSize(chip.size)}</span>
                </div>
              )}

              {chip.status === "uploading" && (
                <div
                  className="flex shrink-0 items-center gap-1.5 text-muted-foreground"
                  data-testid="property-gmail-compose-attachment-uploading"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">{chip.progress}%</span>
                </div>
              )}

              {chip.status === "ready" && (
                <div
                  className="flex shrink-0 items-center gap-1.5 text-muted-foreground"
                  data-testid="property-gmail-compose-attachment-ready"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs">{formatFileSize(chip.file.size)}</span>
                </div>
              )}

              {chip.status === "error" && (
                <div
                  className="flex shrink-0 items-center gap-1.5 text-destructive"
                  data-testid="property-gmail-compose-attachment-error"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="truncate text-xs">{chip.errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => onRetryChip(chip.id)}
                    disabled={sending}
                    aria-label={`Retry upload for ${chip.file.name}`}
                    className="rounded p-0.5 hover:text-foreground"
                    data-testid="property-gmail-compose-attachment-retry"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onRemoveChip(chip.id)}
                disabled={sending}
                aria-label={`Remove ${chip.status === "gmail" ? chip.filename : chip.file.name}`}
                className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                data-testid="property-gmail-compose-attachment-remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={attachFileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => attachFileInputRef.current?.click()}
          disabled={sending}
          data-testid="property-gmail-compose-attach-button"
        >
          <Paperclip className="mr-2 h-3.5 w-3.5" />
          Attach file
        </Button>
      </div>

      {attachmentSizeExceeded && (
        <p
          className="flex items-center gap-1.5 text-sm text-destructive"
          data-testid="property-gmail-compose-size-warning"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          Total size ({formatFileSize(totalAttachmentBytes)}) exceeds the 14.5 MB limit (≈ 20 MB
          encoded). Remove some files to continue.
        </p>
      )}
    </div>
  )
}
