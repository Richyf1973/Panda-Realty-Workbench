"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/dialog"

import { PropertyEntityFilesPanel } from "./property-entity-files-panel"

interface PropertyEntityFilesDialogProps {
  propertyEntityId: number | null
  entityName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PropertyEntityFilesDialog({
  propertyEntityId,
  entityName,
  open,
  onOpenChange,
}: PropertyEntityFilesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="property-entity-files-dialog">
        <DialogHeader>
          <DialogTitle>Files — {entityName}</DialogTitle>
        </DialogHeader>
        <PropertyEntityFilesPanel propertyEntityId={propertyEntityId} variant="edit" />
      </DialogContent>
    </Dialog>
  )
}
