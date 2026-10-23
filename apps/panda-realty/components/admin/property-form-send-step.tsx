"use client"

import { ExternalLink, Loader2 } from "lucide-react"

import { Label } from "@repo/ui/label"
import { Textarea } from "@repo/ui/textarea"

export interface PropertyFormRecipient {
  entityId: number
  entityName: string | null
  emailAddress: string | null
  role: "buyer" | "contact" | "tenant"
}

export function PropertyFormSendStep({
  hasPrefill,
  loadingRecipients,
  recipients,
  selected,
  toggleEntity,
  message,
  setMessage,
  sending,
  savingToDrive,
  driveLink,
  error,
}: {
  hasPrefill: boolean
  loadingRecipients: boolean
  recipients: PropertyFormRecipient[]
  selected: Set<number>
  toggleEntity: (id: number) => void
  message: string
  setMessage: (v: string) => void
  sending: boolean
  savingToDrive?: boolean
  driveLink?: string | null
  error: string | null
}) {
  const withEmail = recipients.filter((r) => r.emailAddress)
  const withoutEmail = recipients.filter((r) => !r.emailAddress)

  return (
    <div className="flex flex-col gap-3">
      {hasPrefill && (
        <p className="rounded-md border border-border bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          A pre-filled PDF copy will be generated and saved to Drive before sending.
        </p>
      )}

      <Label className="text-sm font-medium">Recipients</Label>

      {loadingRecipients ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading recipients…
        </div>
      ) : recipients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entities are attached to this property yet.
        </p>
      ) : (
        <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto" data-testid="property-form-send-recipients">
          {withEmail.map((r) => (
            <label
              key={r.entityId}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 hover:bg-muted/40"
              data-testid={`property-form-send-recipient--${r.entityId}`}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(r.entityId)}
                onChange={() => toggleEntity(r.entityId)}
                disabled={sending || savingToDrive}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{r.entityName ?? "Unknown"}</span>
                <span className="text-xs text-muted-foreground">
                  {r.emailAddress} · {r.role}
                </span>
              </div>
            </label>
          ))}
          {withoutEmail.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {withoutEmail.map((r) => (
                <div
                  key={r.entityId}
                  className="flex items-start gap-2 rounded-md border border-border/50 px-3 py-2 opacity-50"
                  title="No email address on file"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled
                    aria-label={`${r.entityName ?? "Unknown"} — no email address on file`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{r.entityName ?? "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">No email · {r.role}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="send-message" className="text-sm font-medium">
          Message <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="send-message"
          placeholder="Add a short note to include in the email…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          disabled={sending || savingToDrive}
          data-testid="property-form-send-message"
        />
      </div>

      {driveLink && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950">
          <p className="mb-1 text-xs font-medium text-green-800 dark:text-green-300">Saved to Drive</p>
          <a
            href={driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-green-700 underline underline-offset-2 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
            data-testid="property-form-send-drive-link"
          >
            Open in Drive
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" data-testid="property-form-send-error">
          {error}
        </p>
      )}
    </div>
  )
}
