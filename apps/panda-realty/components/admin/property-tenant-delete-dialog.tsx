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

import type { TenantDeleteDialogState } from "./property-tenant-types"

interface PropertyTenantDeleteDialogProps {
  deleteDialog: TenantDeleteDialogState
  closeDeleteDialog: () => void
  confirmDelete: () => Promise<void>
}

export function PropertyTenantDeleteDialog({
  deleteDialog,
  closeDeleteDialog,
  confirmDelete,
}: PropertyTenantDeleteDialogProps) {
  return (
    <Dialog
      open={deleteDialog.open}
      onOpenChange={(open) => {
        if (!open) closeDeleteDialog()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove tenant?</DialogTitle>
          <DialogDescription>
            <strong>{deleteDialog.tenant?.entityName ?? "This tenant"}</strong>{" "}
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
            data-testid="property-tenant-delete-confirm"
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
