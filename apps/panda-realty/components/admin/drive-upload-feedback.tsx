"use client"

import { RefreshCw } from "lucide-react"

import { Button } from "@repo/ui/button"

interface DriveUploadProgressProps {
  uploadPercent: number
  uploadingFileName?: string | null
  testId?: string
}

export function DriveUploadProgress({
  uploadPercent,
  uploadingFileName,
  testId,
}: DriveUploadProgressProps) {
  return (
    <div className="flex flex-col gap-1" data-testid={testId}>
      <p className="truncate text-xs text-muted-foreground">
        {uploadingFileName ? `Uploading ${uploadingFileName}… ` : ""}
        {uploadPercent}%
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${uploadPercent}%` }}
        />
      </div>
    </div>
  )
}

interface DriveUploadErrorProps {
  uploadError: string
  retryFile: File | null
  onRetry: () => void
  testId?: string
  retryTestId?: string
}

export function DriveUploadError({
  uploadError,
  retryFile,
  onRetry,
  testId,
  retryTestId,
}: DriveUploadErrorProps) {
  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <p className="flex-1 text-sm text-destructive">{uploadError}</p>
      {retryFile && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          data-testid={retryTestId}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}
