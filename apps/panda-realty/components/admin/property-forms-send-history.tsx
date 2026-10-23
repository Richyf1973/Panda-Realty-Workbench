"use client"

import { ExternalLink, Pencil, Send } from "lucide-react"

import { Button } from "@repo/ui/button"

import { hasPrefillFillStep } from "@/lib/admin/constants"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"

import type { FormSendRow } from "./use-forms-tab"

interface Props {
  loadingHistory: boolean
  sendHistory: FormSendRow[]
  onEdit: (row: FormSendRow) => void
  onResend: (row: FormSendRow) => void
}

export function PropertyFormsSendHistory({ loadingHistory, sendHistory, onEdit, onResend }: Props) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Send History</h3>
      {loadingHistory ? (
        <LoadingSkeleton />
      ) : sendHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="property-forms-history-empty">
          No forms have been sent from this property yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-md border border-border" data-testid="property-forms-history-list">
          {sendHistory.map((row) => {
            const canEdit = hasPrefillFillStep(row.prefillStrategy) && row.prefillValues !== null
            const hasNoValues = hasPrefillFillStep(row.prefillStrategy) && row.prefillValues === null
            return (
              <div
                key={row.propertyFormSendId}
                className="flex flex-col gap-0.5 px-3 py-2"
                data-testid={`property-forms-history-row--${row.propertyFormSendId}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{row.formName}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {row.sentAt ? new Date(row.sentAt).toLocaleString() : "—"}
                    </span>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-xs"
                        onClick={() => onEdit(row)}
                        data-testid={`property-forms-history-edit--${row.propertyFormSendId}`}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                    {row.driveFileLink && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-xs"
                        onClick={() => onResend(row)}
                        data-testid={`property-forms-history-send--${row.propertyFormSendId}`}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Send
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  {row.recipientEmail && (
                    <span>
                      {row.recipientName ? `${row.recipientName} · ` : ""}
                      {row.recipientEmail}
                    </span>
                  )}
                  {row.driveFileLink && !row.driveFileLink.includes("/offer-form/") && (
                    <a
                      href={row.driveFileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
                      data-testid={`property-forms-history-view-link--${row.propertyFormSendId}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View in Drive
                    </a>
                  )}
                  {row.driveFileLink?.includes("/offer-form/") && (
                    <a
                      href={row.driveFileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Open Form
                    </a>
                  )}
                  {!row.driveFileLink && !row.recipientEmail && (
                    <span>Saved to Drive</span>
                  )}
                  {hasNoValues && (
                    <span
                      className="text-muted-foreground/70 italic"
                      data-testid={`property-forms-history-no-values-note--${row.propertyFormSendId}`}
                    >
                      ⓘ No saved values — this entry cannot be re-edited.
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
