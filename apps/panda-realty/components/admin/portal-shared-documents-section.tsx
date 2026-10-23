"use client"

import { useEffect, useState } from "react"
import { FileText, Loader2, RefreshCw } from "lucide-react"
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

import { type SharedFile, SignStatusCell } from "./sign-status-cell"

interface Props {
  portalTokenId: number
}

export function PortalSharedDocumentsSection({ portalTokenId }: Props) {
  const [files, setFiles] = useState<SharedFile[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [reminding, setReminding] = useState<Set<number>>(new Set())
  const [cancelTarget, setCancelTarget] = useState<{ signRequestId: number; driveFileId: string } | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [syncing, setSyncing] = useState(false)

  function fetchFiles(signal?: AbortSignal) {
    setLoadError(false)
    return fetch(`/api/admin/portal-tokens/${portalTokenId}/shared-files`, { signal })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json() as Promise<SharedFile[]>
      })
  }

  useEffect(() => {
    const controller = new AbortController()

    // Fire-and-forget sign-status check on mount — webhook-miss fallback
    void fetch(`/api/admin/portal-tokens/${portalTokenId}/sign-status`)

    fetchFiles(controller.signal)
      .then((data) => setFiles(data))
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return
        setLoadError(true)
        setFiles([])
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalTokenId])

  if (files === null) {
    return (
      <div data-testid="portal-shared-documents-section" className="mt-4 space-y-2">
        <p className="text-sm font-medium">Shared documents</p>
        <div className="flex items-center justify-center rounded-md border border-border py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium">Shared documents</p>
        <p className="text-xs text-destructive">Could not load shared documents. Please try again.</p>
      </div>
    )
  }

  if (files.length === 0) return null

  async function handleSend(driveFileId: string) {
    setSending((prev) => new Set(prev).add(driveFileId))
    try {
      const res = await fetch(`/api/admin/portal-tokens/${portalTokenId}/sign-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: driveFileId }),
      })
      const data = (await res.json()) as { error?: string; id?: number }
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send for signature. Please try again.")
        return
      }
      setFiles((prev) =>
        prev
          ? prev.map((f) =>
              f.driveFileId === driveFileId
                ? { ...f, signatureStatus: "pending", signRequestId: data.id ?? null }
                : f,
            )
          : prev,
      )
      toast.success("Sent for signature")
    } catch {
      toast.error("Failed to send for signature. Please try again.")
    } finally {
      setSending((prev) => {
        const next = new Set(prev)
        next.delete(driveFileId)
        return next
      })
    }
  }

  async function handleResend(signRequestId: number) {
    setReminding((prev) => new Set(prev).add(signRequestId))
    try {
      const res = await fetch(`/api/admin/sign-requests/${signRequestId}/remind`, { method: "POST" })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Failed to send reminder. Please try again.")
        return
      }
      toast.success("Reminder sent")
    } catch {
      toast.error("Failed to send reminder. Please try again.")
    } finally {
      setReminding((prev) => {
        const next = new Set(prev)
        next.delete(signRequestId)
        return next
      })
    }
  }

  async function handleCancelConfirm() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/sign-requests/${cancelTarget.signRequestId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Failed to cancel agreement. Please try again.")
        return
      }
      setFiles((prev) =>
        prev
          ? prev.map((f) =>
              f.driveFileId === cancelTarget.driveFileId ? { ...f, signatureStatus: "cancelled" } : f,
            )
          : prev,
      )
      setCancelTarget(null)
      toast.success("Agreement cancelled")
    } catch {
      toast.error("Failed to cancel agreement. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  async function handleSyncStatus() {
    setSyncing(true)
    try {
      await fetch(`/api/admin/portal-tokens/${portalTokenId}/sign-status`)
      const data = await fetchFiles()
      setFiles(data)
    } catch {
      toast.error("Could not refresh signing status. Please try again.")
    } finally {
      setSyncing(false)
    }
  }

  const hasPending = files.some((f) => f.signatureStatus === "pending")

  return (
    <>
      <div data-testid="portal-shared-documents-section" className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Shared documents</p>
          {hasPending && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="portal-sync-sign-status-btn"
              disabled={syncing}
              onClick={() => void handleSyncStatus()}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} aria-hidden />
              {syncing ? "Refreshing…" : "Refresh status"}
            </Button>
          )}
        </div>
        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {files.map((file) => (
            <div
              key={file.driveFileId}
              data-testid={`portal-shared-file-row--${file.driveFileId}`}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">
                {file.fileName ?? "Untitled file"}
              </span>
              <SignStatusCell
                file={file}
                onSend={handleSend}
                onResend={handleResend}
                onCancelRequest={(signRequestId, driveFileId) =>
                  setCancelTarget({ signRequestId, driveFileId })
                }
                sending={sending}
                reminding={reminding}
              />
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => { if (!open && !cancelling) setCancelTarget(null) }}
      >
        <DialogContent className="max-w-sm" data-testid="portal-cancel-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Cancel agreement?</DialogTitle>
            <DialogDescription>
              This will cancel the signing request. The signer will no longer be able to sign this document.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => setCancelTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="portal-cancel-confirm-btn"
              disabled={cancelling}
              onClick={() => void handleCancelConfirm()}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling…
                </>
              ) : (
                "Cancel agreement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
