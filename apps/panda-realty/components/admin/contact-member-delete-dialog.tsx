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

import type { ContactMemberDeleteDialogState } from "./contact-member-types"

interface ContactMemberDeleteDialogProps {
  deleteDialog: ContactMemberDeleteDialogState
  closeDeleteDialog: () => void
  confirmDelete: () => Promise<void>
}

export function ContactMemberDeleteDialog({
  deleteDialog,
  closeDeleteDialog,
  confirmDelete,
}: ContactMemberDeleteDialogProps) {
  return (
    <Dialog
      open={deleteDialog.open}
      onOpenChange={(open) => {
        if (!open) closeDeleteDialog()
      }}
    >
      <DialogContent className="max-w-sm" data-testid="contact-member-delete-dialog">
        <DialogHeader>
          <DialogTitle>Remove representative?</DialogTitle>
          <DialogDescription>
            <strong>{deleteDialog.member?.memberName ?? "This representative"}</strong>{" "}
            will be removed from this contact.
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
            data-testid="contact-member-delete-confirm"
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
