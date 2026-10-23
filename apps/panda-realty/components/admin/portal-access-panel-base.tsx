"use client"

import type { ReactNode } from "react"
import { formatDistanceToNow, format } from "date-fns"
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"

import { PortalRevokeRegenDialogs } from "./portal-revoke-regen-dialogs"
import { SendViaEmailButton } from "./send-via-email-button"

export interface PortalToken {
  portalTokenId: number
  token: string
  propertyEntityId: number | null
  propertyListId: number
  role: string
  revokedAt: string | null
  lastAccessedAt: string | null
  createdAt: string | null
}

export type PanelState =
  | { kind: "loading" }
  | { kind: "no-token" }
  | { kind: "active"; token: PortalToken }
  | { kind: "revoked"; token: PortalToken }

interface PortalAccessPanelBaseProps {
  state: PanelState
  copied: boolean
  revoking: boolean
  generating: boolean
  sending?: boolean
  sellerEmail?: string | null
  revokeDialogOpen: boolean
  regenDialogOpen: boolean
  testIdPrefix: string
  containerTestId?: string
  label: string
  portalPath: string
  onGenerate: () => void
  onRevoke: () => void
  onCopyLink: () => void
  onSendEmail?: () => void
  onRevokeDialogOpen: (open: boolean) => void
  onRegenDialogOpen: (open: boolean) => void
  crashSection?: ReactNode
}

function relativeTime(iso: string | null) {
  if (!iso) return "never opened"
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

function revokedDate(iso: string | null) {
  if (!iso) return ""
  return format(new Date(iso), "d MMMM yyyy")
}

export function PortalAccessPanelBase({
  state,
  copied,
  revoking,
  generating,
  sending = false,
  sellerEmail,
  revokeDialogOpen,
  regenDialogOpen,
  testIdPrefix,
  containerTestId,
  label,
  portalPath,
  onGenerate,
  onRevoke,
  onCopyLink,
  onSendEmail,
  onRevokeDialogOpen,
  onRegenDialogOpen,
  crashSection,
}: PortalAccessPanelBaseProps) {
  const wrapperTestId = containerTestId ?? testIdPrefix

  function portalUrl(token: string) {
    return `${window.location.origin}${portalPath}/${token}`
  }

  return (
    <div data-testid={wrapperTestId} className="flex flex-col gap-4 p-1">
      <p className="text-sm font-medium">{label}</p>

      {state.kind === "loading" && (
        <div className="flex items-center justify-center h-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {state.kind === "no-token" && (
        <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
          <p className="text-sm">No portal link generated yet.</p>
          <Button
            type="button"
            size="sm"
            data-testid={`${testIdPrefix}-generate-btn`}
            disabled={generating}
            onClick={onGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate portal link"
            )}
          </Button>
        </div>
      )}

      {state.kind === "active" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <span
              data-testid={`${testIdPrefix}-url-display`}
              className="flex-1 truncate font-mono text-xs"
            >
              {portalUrl(state.token.token)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid={`${testIdPrefix}-copy-btn`}
              onClick={onCopyLink}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid={`${testIdPrefix}-open-btn`}
              asChild
            >
              <a
                href={portalUrl(state.token.token)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open portal
              </a>
            </Button>
            {onSendEmail && (
              <SendViaEmailButton
                sellerEmail={sellerEmail ?? null}
                sending={sending}
                onSendEmail={onSendEmail}
                testIdPrefix={testIdPrefix}
              />
            )}
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <span data-testid={`${testIdPrefix}-last-visited`}>
              Last visited: {relativeTime(state.token.lastAccessedAt)}
            </span>
            {state.token.createdAt && (
              <span data-testid={`${testIdPrefix}-generated-at`}>
                Generated {relativeTime(state.token.createdAt)}
              </span>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              data-testid={`${testIdPrefix}-revoke-btn`}
              onClick={() => onRevokeDialogOpen(true)}
            >
              Revoke access
            </Button>
          </div>

          {crashSection}
        </div>
      )}

      {state.kind === "revoked" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p
            data-testid={`${testIdPrefix}-revoked-status`}
            className="text-sm text-muted-foreground"
          >
            Access revoked on {revokedDate(state.token.revokedAt)}.
          </p>
          <Button
            type="button"
            size="sm"
            data-testid={`${testIdPrefix}-regen-btn`}
            onClick={() => onRegenDialogOpen(true)}
          >
            Generate new link
          </Button>
        </div>
      )}

      <PortalRevokeRegenDialogs
        testIdPrefix={testIdPrefix}
        revokeDialogOpen={revokeDialogOpen}
        regenDialogOpen={regenDialogOpen}
        revoking={revoking}
        generating={generating}
        onRevokeDialogOpen={onRevokeDialogOpen}
        onRegenDialogOpen={onRegenDialogOpen}
        onRevoke={onRevoke}
        onGenerate={onGenerate}
      />
    </div>
  )
}
