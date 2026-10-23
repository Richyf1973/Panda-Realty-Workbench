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

import type { DeleteDialogState } from "./buyer-member-types"

interface BuyerMemberDeleteDialogProps {
  deleteDialog: DeleteDialogState
  closeDeleteDialog: () => void
  confirmDelete: () => Promise<void>
}

export function BuyerMemberDeleteDialog({
  deleteDialog,
  closeDeleteDialog,
  confirmDelete,
}: BuyerMemberDeleteDialogProps) {
  return (
    <Dialog
      open={deleteDialog.open}
      onOpenChange={(open) => {
        if (!open) closeDeleteDialog()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove member?</DialogTitle>
          <DialogDescription>
            <strong>{deleteDialog.member?.memberName ?? "This member"}</strong>{" "}
            will be removed from the buyer workspace. Any linked Google
            Calendar event will also be deleted.
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
