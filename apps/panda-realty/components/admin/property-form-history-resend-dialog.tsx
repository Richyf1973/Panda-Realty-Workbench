"use client"

import { ExternalLink, Loader2, Plus, Send, X } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Textarea } from "@repo/ui/textarea"

import type { FormSendRow } from "./use-forms-tab"
import type { EmailEntry } from "./use-property-form-history-resend"

interface Props {
  row: FormSendRow
  emails: EmailEntry[]
  message: string
  sending: boolean
  error: string | null
  hasValidEmail: boolean
  onClose: () => void
  onSetEmail: (index: number, value: string) => void
  onAddEmail: () => void
  onSetMessage: (v: string) => void
  onSubmit: () => void
}

export function PropertyFormHistoryResendDialog({
  row,
  emails,
  message,
  sending,
  error,
  hasValidEmail,
  onClose,
  onSetEmail,
  onAddEmail,
  onSetMessage,
  onSubmit,
}: Props) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
      data-testid="property-forms-history-send-dialog"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose() }}
      onKeyDown={(e) => { if (e.key === "Escape" && !sending) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="history-resend-dialog-title" className="relative mx-4 flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-background text-sm ring-1 ring-foreground/10">
        <button
          type="button"
          className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-1 px-4 pb-3 pt-4">
          <h2 id="history-resend-dialog-title" className="font-heading text-base font-medium leading-none">Send Form</h2>
          <p className="text-sm text-muted-foreground">{row.formName}</p>
        </div>

        <div className="flex flex-col gap-3 px-4 pb-3 overflow-y-auto">
          {row.driveFileLink && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Drive File</p>
              <a
                href={row.driveFileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs underline underline-offset-2 hover:text-foreground"
                data-testid="property-forms-history-send-drive-link"
              >
                View in Drive
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Recipients</Label>
            <div className="flex flex-col gap-1.5">
              {emails.map((email, i) => (
                <Input
                  key={email.id}
                  type="email"
                  placeholder="email@example.com"
                  value={email.value}
                  onChange={(e) => onSetEmail(i, e.target.value)}
                  disabled={sending}
                  data-testid={`property-forms-history-send-email-${i}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
              onClick={onAddEmail}
              disabled={sending}
              data-testid="property-forms-history-send-add-email"
            >
              <Plus className="h-3 w-3" />
              Add another
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resend-message" className="text-sm font-medium">
              Message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="resend-message"
              placeholder="Add a short note…"
              value={message}
              onChange={(e) => onSetMessage(e.target.value)}
              rows={3}
              disabled={sending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!hasValidEmail || sending}
            data-testid="property-forms-history-send-submit"
          >
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
