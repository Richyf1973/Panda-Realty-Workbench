"use client"

import { ExternalLink, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"

import { InlinePortalMessages, type InlineMessageToken } from "./inline-portal-messages"
import type { PanelState } from "./portal-access-panel-base"
import { PortalRevokeRegenDialogs } from "./portal-revoke-regen-dialogs"
import { SendViaEmailButton } from "./send-via-email-button"

const SELLER_PORTAL_PATH = "/portal/seller"

interface PropertySellerPortalCompactProps {
  state: PanelState
  ensureSellerToken: () => Promise<InlineMessageToken | null>
  autoOpenMessages?: boolean
  revoking: boolean
  generating: boolean
  sending: boolean
  sellerEmail: string | null
  revokeDialogOpen: boolean
  regenDialogOpen: boolean
  crashDialogOpen: boolean
  crashing: boolean
  crashError: string | null
  onGenerate: () => void
  onSendEmail: () => void
  onRevoke: () => void
  onSetRevokeDialogOpen: (open: boolean) => void
  onSetRegenDialogOpen: (open: boolean) => void
  onSetCrashDialogOpen: (open: boolean) => void
  onSetCrashError: (error: string | null) => void
  onCrash: () => void
}

export function PropertySellerPortalCompact({
  state,
  ensureSellerToken,
  autoOpenMessages = false,
  revoking,
  generating,
  sending,
  sellerEmail,
  revokeDialogOpen,
  regenDialogOpen,
  crashDialogOpen,
  crashing,
  crashError,
  onGenerate,
  onSendEmail,
  onRevoke,
  onSetRevokeDialogOpen,
  onSetRegenDialogOpen,
  onSetCrashDialogOpen,
  onSetCrashError,
  onCrash,
}: PropertySellerPortalCompactProps) {
  const compactUrl = state.kind === "active"
    ? `${window.location.origin}${SELLER_PORTAL_PATH}/${state.token.token}`
    : null

  const messagesToken: InlineMessageToken | null =
    state.kind === "active" || state.kind === "revoked"
      ? { portalTokenId: state.token.portalTokenId, revokedAt: state.token.revokedAt }
      : null

  return (
    <>
      <div className="flex flex-wrap items-center gap-1" data-testid="portal-seller-compact-header">
        {state.kind === "loading" && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {state.kind === "no-token" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 sm:h-9"
            disabled={generating}
            data-testid="portal-seller-generate-btn"
            onClick={onGenerate}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
            ) : (
              "Generate portal link"
            )}
          </Button>
        )}
        {state.kind === "active" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-9"
              data-testid="portal-seller-open-btn"
              asChild
            >
              <a href={compactUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Portal
              </a>
            </Button>
            <SendViaEmailButton
              sellerEmail={sellerEmail}
              sending={sending}
              onSendEmail={onSendEmail}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-9"
              data-testid="portal-seller-revoke-btn"
              onClick={() => onSetRevokeDialogOpen(true)}
            >
              Revoke
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-9"
              data-testid="portal-seller-crash-btn"
              onClick={() => { onSetCrashError(null); onSetCrashDialogOpen(true) }}
            >
              Contract Crash
            </Button>
          </>
        )}
        {state.kind === "revoked" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 sm:h-9"
            disabled={generating}
            data-testid="portal-seller-regen-btn"
            onClick={() => onSetRegenDialogOpen(true)}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
            ) : (
              "Generate new link"
            )}
          </Button>
        )}
        {state.kind !== "loading" && (
          <InlinePortalMessages
            buttonTestId="portal-seller-messages-btn"
            unreadTestId="portal-seller-messages-unread"
            panelTestId="portal-seller-messages-panel"
            initialToken={messagesToken}
            ensureToken={ensureSellerToken}
            autoOpen={autoOpenMessages}
          />
        )}
      </div>

      <PortalRevokeRegenDialogs
        testIdPrefix="portal-seller"
        revokeDialogOpen={revokeDialogOpen}
        regenDialogOpen={regenDialogOpen}
        revoking={revoking}
        generating={generating}
        onRevokeDialogOpen={onSetRevokeDialogOpen}
        onRegenDialogOpen={onSetRegenDialogOpen}
        onRevoke={onRevoke}
        onGenerate={onGenerate}
      />

      <Dialog
        open={crashDialogOpen}
        onOpenChange={(next) => { if (!next && !crashing) onSetCrashDialogOpen(false) }}
      >
        <DialogContent data-testid="portal-seller-crash-dialog">
          <DialogHeader>
            <DialogTitle>Trigger Contract Crash?</DialogTitle>
            <DialogDescription>This action will atomically:</DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>Un-accept the current accepted offer</li>
            <li>Reset the deal pipeline stage</li>
            <li>Revoke the current buyer portal access link</li>
            <li>Reset all Share with buyer file toggles</li>
            <li>Revoke the current seller portal link</li>
            <li>Generate a new seller portal link</li>
          </ul>
          {crashError && (
            <p data-testid="portal-seller-crash-error" className="text-sm text-destructive">
              {crashError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-testid="portal-seller-crash-cancel-btn"
              disabled={crashing}
              onClick={() => onSetCrashDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="portal-seller-crash-confirm-btn"
              disabled={crashing}
              onClick={onCrash}
            >
              {crashing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
