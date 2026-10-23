"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  PortalAccessPanelBase,
  type PanelState,
  type PortalToken,
} from "./portal-access-panel-base"
import { PortalSharedDocumentsSection } from "./portal-shared-documents-section"

interface PropertyEntityPortalPanelProps {
  propertyEntityId: number
  variant: "create" | "edit"
}

export function PropertyEntityPortalPanel({
  propertyEntityId,
  variant,
}: PropertyEntityPortalPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: "loading" })
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | undefined>(undefined)
  const [revoking, setRevoking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  const load = useCallback(async (signal?: AbortSignal) => {
    setState({ kind: "loading" })
    try {
      const res = await fetch(
        `/api/admin/portal-tokens?propertyEntityId=${propertyEntityId}`,
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
  }, [propertyEntityId])

  useEffect(() => {
    if (variant !== "edit") { setState({ kind: "no-token" }); return }
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [variant, load])

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/portal-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId, propertyListId: 0 }),
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

  async function sendEmail() {
    setSending(true)
    try {
      const res = await fetch("/api/admin/portal-tokens/buyer/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId }),
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

  async function copyLink() {
    if (state.kind !== "active") return
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/portal/${state.token.token}`,
      )
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <PortalAccessPanelBase
        state={state}
        copied={copied}
        revoking={revoking}
        generating={generating}
        sending={sending}
        revokeDialogOpen={revokeDialogOpen}
        regenDialogOpen={regenDialogOpen}
        testIdPrefix="portal-access-panel"
        label="Client portal access"
        portalPath="/portal"
        onGenerate={() => void generate()}
        onRevoke={() => void revoke()}
        onCopyLink={() => void copyLink()}
        onSendEmail={() => void sendEmail()}
        onRevokeDialogOpen={setRevokeDialogOpen}
        onRegenDialogOpen={setRegenDialogOpen}
      />
      {state.kind === "active" && (
        <PortalSharedDocumentsSection portalTokenId={state.token.portalTokenId} />
      )}
    </div>
  )
}
