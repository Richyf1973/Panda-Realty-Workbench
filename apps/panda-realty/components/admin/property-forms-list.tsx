"use client"

import { ExternalLink, FileUp, Loader2, Pencil, Send, Upload } from "lucide-react"

import { Button } from "@repo/ui/button"

import { hasPrefillFillStep, PREFILL_STRATEGY_PRO_FORMA_2026 } from "@/lib/admin/constants"
import { DriveUploadProgress, DriveUploadError } from "@/components/admin/drive-upload-feedback"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"

import type { PropertyFormRow } from "./use-forms-tab"

interface Props {
  loadingForms: boolean
  forms: PropertyFormRow[]
  uploading: boolean
  uploadPercent: number
  uploadingFileName: string | null | undefined
  uploadError: string | null
  retryFile: File | null
  fileInputId: string
  onRetry: () => void
  onSendDialog: (form: PropertyFormRow) => void
  onSendLinkDialog: (form: PropertyFormRow) => void
}

export function PropertyFormsList({
  loadingForms,
  forms,
  uploading,
  uploadPercent,
  uploadingFileName,
  uploadError,
  retryFile,
  fileInputId,
  onRetry,
  onSendDialog,
  onSendLinkDialog,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Forms</h3>
        <label
          htmlFor={fileInputId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/60 ${uploading ? "pointer-events-none opacity-50" : ""}`}
          data-testid="property-forms-upload-btn"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-4 w-4" /> Upload Form</>
          )}
        </label>
      </div>

      {uploading && <DriveUploadProgress uploadPercent={uploadPercent} uploadingFileName={uploadingFileName} />}

      {uploadError && (
        <DriveUploadError
          uploadError={uploadError}
          retryFile={retryFile}
          onRetry={onRetry}
          testId="property-forms-upload-error"
          retryTestId="property-forms-upload-retry"
        />
      )}

      {loadingForms ? (
        <LoadingSkeleton />
      ) : forms.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="property-forms-empty">
          No active forms yet. Upload a form to get started.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border" data-testid="property-forms-list">
          {forms.map((form) => (
            <div
              key={form.propertyFormId}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
              data-testid={`property-forms-row--${form.propertyFormId}`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="truncate text-sm font-medium">{form.formName}</span>
                {form.category && <span className="text-xs text-muted-foreground">{form.category}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {form.fileLink && form.prefillStrategy !== PREFILL_STRATEGY_PRO_FORMA_2026 && (
                  <a
                    href={form.fileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    data-testid={`property-forms-link--${form.propertyFormId}`}
                  >
                    {hasPrefillFillStep(form.prefillStrategy) ? (
                      <><ExternalLink className="h-3.5 w-3.5" />View in Drive</>
                    ) : (
                      <><ExternalLink className="h-3.5 w-3.5" />View</>
                    )}
                  </a>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    form.prefillStrategy === PREFILL_STRATEGY_PRO_FORMA_2026
                      ? onSendLinkDialog(form)
                      : onSendDialog(form)
                  }
                  data-testid={`property-forms-send--${form.propertyFormId}`}
                >
                  {form.prefillStrategy === PREFILL_STRATEGY_PRO_FORMA_2026 ? (
                    <><Send className="mr-1.5 h-3.5 w-3.5" />Send Link</>
                  ) : hasPrefillFillStep(form.prefillStrategy) ? (
                    <><Pencil className="mr-1.5 h-3.5 w-3.5" />Fill Form</>
                  ) : (
                    <><FileUp className="mr-1.5 h-3.5 w-3.5" />Send File</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
