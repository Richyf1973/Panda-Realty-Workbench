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

import type { ContactDeleteDialogState } from "./property-contact-types"

interface PropertyContactDeleteDialogProps {
  deleteDialog: ContactDeleteDialogState
  closeDeleteDialog: () => void
  confirmDelete: () => Promise<void>
}

export function PropertyContactDeleteDialog({
  deleteDialog,
  closeDeleteDialog,
  confirmDelete,
}: PropertyContactDeleteDialogProps) {
  return (
    <Dialog
      open={deleteDialog.open}
      onOpenChange={(open) => {
        if (!open) closeDeleteDialog()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove contact?</DialogTitle>
          <DialogDescription>
            <strong>{deleteDialog.contact?.entityName ?? "This contact"}</strong>{" "}
            will be removed from this property.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleteDialog.deleting}
            onClick={closeDeleteDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteDialog.deleting}
            onClick={() => void confirmDelete()}
            data-testid="property-contact-delete-confirm"
          >
            {deleteDialog.deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removing…
              </>
            ) : (
              "Remove"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
