"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"

interface PortalRevokeRegenDialogsProps {
  testIdPrefix: string
  revokeDialogOpen: boolean
  regenDialogOpen: boolean
  revoking: boolean
  generating: boolean
  onRevokeDialogOpen: (open: boolean) => void
  onRegenDialogOpen: (open: boolean) => void
  onRevoke: () => void
  onGenerate: () => void
}

export function PortalRevokeRegenDialogs({
  testIdPrefix,
  revokeDialogOpen,
  regenDialogOpen,
  revoking,
  generating,
  onRevokeDialogOpen,
  onRegenDialogOpen,
  onRevoke,
  onGenerate,
}: PortalRevokeRegenDialogsProps) {
  return (
    <>
      <Dialog
        open={revokeDialogOpen}
        onOpenChange={(next) => { if (!next && !revoking) onRevokeDialogOpen(false) }}
      >
        <DialogContent className="max-w-sm" data-testid={`${testIdPrefix}-revoke-dialog`}>
          <DialogHeader>
            <DialogTitle>Revoke portal access?</DialogTitle>
            <DialogDescription>
              The existing link will stop working immediately. You can generate a new one afterwards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-testid={`${testIdPrefix}-revoke-cancel-btn`}
              disabled={revoking}
              onClick={() => onRevokeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid={`${testIdPrefix}-revoke-confirm-btn`}
              disabled={revoking}
              onClick={onRevoke}
            >
              {revoking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Revoking…
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={regenDialogOpen}
        onOpenChange={(next) => { if (!next && !generating) onRegenDialogOpen(false) }}
      >
        <DialogContent className="max-w-sm" data-testid={`${testIdPrefix}-regen-dialog`}>
          <DialogHeader>
            <DialogTitle>Generate new portal link?</DialogTitle>
            <DialogDescription>
              A new unique link will be created. Share it with the client.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-testid={`${testIdPrefix}-regen-cancel-btn`}
              disabled={generating}
              onClick={() => onRegenDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid={`${testIdPrefix}-regen-confirm-btn`}
              disabled={generating}
              onClick={onGenerate}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
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
