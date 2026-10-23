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

export function PropertyFileDeleteConfirmDialog({
  open,
  fileName,
  deleting,
  deleteError,
  onRequestClose,
  onConfirm,
}: {
  open: boolean
  fileName: string | null | undefined
  deleting: boolean
  deleteError?: string | null
  onRequestClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onRequestClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete file?</DialogTitle>
          <DialogDescription>
            <strong>{fileName ?? "This file"}</strong> will be permanently deleted from Google Drive
            and removed from the record. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={deleting} onClick={onRequestClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void onConfirm()}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
