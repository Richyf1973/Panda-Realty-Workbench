"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"

import type { InlineMessageToken } from "./inline-portal-messages"
import {
  PortalAccessPanelBase,
  type PanelState,
  type PortalToken,
} from "./portal-access-panel-base"
import { PropertySellerPortalCompact } from "./property-seller-portal-compact"

const SELLER_PORTAL_PATH = "/portal/seller"

interface PropertySellerPortalPanelProps {
  propertyListId: number
  variant: "create" | "edit"
  compact?: boolean
  sellerEmail?: string | null
  /** Deep link: auto-open the seller's portal messages on mount (from a notification email link). */
  autoOpenMessages?: boolean
}

export function PropertySellerPortalPanel({
  propertyListId,
  variant,
  compact = false,
  sellerEmail,
  autoOpenMessages = false,
}: PropertySellerPortalPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: "loading" })
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | undefined>(undefined)
  const [revoking, setRevoking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)
  const [crashDialogOpen, setCrashDialogOpen] = useState(false)
  const [crashing, setCrashing] = useState(false)
  const [crashError, setCrashError] = useState<string | null>(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(
        `/api/admin/portal-tokens/seller?propertyListId=${propertyListId}`,
        { signal },
      )
      if (signal?.aborted) return
      if (!res.ok) { setState({ kind: "no-token" }); return }
      const token = (await res.json()) as PortalToken | null
      if (!token) setState({ kind: "no-token" })
      else if (token.revokedAt) setState({ kind: "revoked", token })
      else setState({ kind: "active", token })
    } catch {
      if (signal?.aborted) return
      setState({ kind: "no-token" })
    }
  }, [propertyListId])

  useEffect(() => {
    if (variant !== "edit") { setState({ kind: "no-token" }); return }
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [variant, load])

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/portal-tokens/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyListId }),
      })
      if (!res.ok) return
      const token = (await res.json()) as PortalToken
      setState({ kind: "active", token })
    } finally {
      setGenerating(false)
      setRegenDialogOpen(false)
    }
  }

  async function revoke() {
    if (state.kind !== "active") return
    setRevoking(true)
    try {
      const res = await fetch(`/api/admin/portal-tokens/${state.token.portalTokenId}`, {
        method: "PATCH",
      })
      if (!res.ok) return
      const token = (await res.json()) as PortalToken
      setState({ kind: "revoked", token })
      setRevokeDialogOpen(false)
    } finally {
      setRevoking(false)
    }
  }

  async function copyLink() {
    if (state.kind !== "active") return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${SELLER_PORTAL_PATH}/${state.token.token}`,
      )
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy link to clipboard")
    }
  }

  async function sendEmail() {
    setSending(true)
    try {
      const res = await fetch("/api/admin/portal-tokens/seller/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyListId }),
      })
      const data = (await res.json()) as { recipientEmail?: string; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send email. Please try again.")
        return
      }
      toast.success("Portal link sent", { description: `Sent to ${data.recipientEmail ?? ""}` })
    } catch {
      toast.error("Failed to send email. Please try again.")
    } finally {
      setSending(false)
    }
  }

  async function crash() {
    setCrashing(true)
    setCrashError(null)
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyListId}/contract-crash`,
        { method: "POST" },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        setCrashError(body.error ?? "Something went wrong. Please try again.")
        return
      }
      const { sellerToken } = (await res.json()) as { sellerToken: PortalToken }
      setState({ kind: "active", token: sellerToken })
      setCrashDialogOpen(false)
    } catch {
      setCrashError("Network error. Please try again.")
    } finally {
      setCrashing(false)
    }
  }

  // Resolve the seller portal token for inline messaging, generating one when none is active yet.
  async function ensureSellerToken(): Promise<InlineMessageToken | null> {
    if (state.kind === "active") {
      return { portalTokenId: state.token.portalTokenId, revokedAt: state.token.revokedAt }
    }
    try {
      const res = await fetch("/api/admin/portal-tokens/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyListId }),
      })
      if (!res.ok) return null
      const token = (await res.json()) as PortalToken
      setState({ kind: "active", token })
      return { portalTokenId: token.portalTokenId, revokedAt: token.revokedAt }
    } catch {
      return null
    }
  }

  if (compact) {
    return (
      <PropertySellerPortalCompact
        state={state}
        ensureSellerToken={ensureSellerToken}
        autoOpenMessages={autoOpenMessages}
        revoking={revoking}
        generating={generating}
        sending={sending}
        sellerEmail={sellerEmail ?? null}
        revokeDialogOpen={revokeDialogOpen}
        regenDialogOpen={regenDialogOpen}
        crashDialogOpen={crashDialogOpen}
        crashing={crashing}
        crashError={crashError}
        onGenerate={() => void generate()}
        onSendEmail={() => void sendEmail()}
        onRevoke={() => void revoke()}
        onSetRevokeDialogOpen={setRevokeDialogOpen}
        onSetRegenDialogOpen={setRegenDialogOpen}
        onSetCrashDialogOpen={setCrashDialogOpen}
        onSetCrashError={setCrashError}
        onCrash={() => void crash()}
      />
    )
  }

  const crashSection = state.kind === "active" ? (
    <div className="flex justify-end">
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="portal-seller-crash-btn"
        onClick={() => { setCrashError(null); setCrashDialogOpen(true) }}
      >
        Contract Crash
      </Button>
    </div>
  ) : null

  return (
    <>
    <PortalAccessPanelBase
      state={state}
      copied={copied}
      revoking={revoking}
      generating={generating}
      sending={sending}
      sellerEmail={sellerEmail ?? null}
      revokeDialogOpen={revokeDialogOpen}
      regenDialogOpen={regenDialogOpen}
      testIdPrefix="portal-seller"
      containerTestId="portal-seller-access-panel"
      label="Seller portal access"
      portalPath={SELLER_PORTAL_PATH}
      onGenerate={() => void generate()}
      onRevoke={() => void revoke()}
      onCopyLink={() => void copyLink()}
      onSendEmail={() => void sendEmail()}
      onRevokeDialogOpen={setRevokeDialogOpen}
      onRegenDialogOpen={setRegenDialogOpen}
      crashSection={crashSection}
    />

    <Dialog
      open={crashDialogOpen}
      onOpenChange={(next) => { if (!next && !crashing) setCrashDialogOpen(false) }}
    >
      <DialogContent data-testid="portal-seller-crash-dialog">
        <DialogHeader>
          <DialogTitle>Trigger Contract Crash?</DialogTitle>
          <DialogDescription>
            This action will atomically:
          </DialogDescription>
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
          <p
            data-testid="portal-seller-crash-error"
            className="text-sm text-destructive"
          >
            {crashError}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            data-testid="portal-seller-crash-cancel-btn"
            disabled={crashing}
            onClick={() => setCrashDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="portal-seller-crash-confirm-btn"
            disabled={crashing}
            onClick={() => void crash()}
          >
            {crashing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
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
