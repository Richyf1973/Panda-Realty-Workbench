"use client"

import { useState } from "react"
import { Checkbox } from "@repo/ui/checkbox"
import { Button } from "@repo/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog"
import { Label } from "@repo/ui/label"

type Property = {
  propertyEntityId: number
  streetAddress: string
  suburb: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  buyerName: string
  stageName: string
  properties: Property[]
  onConfirm: (selectedIds: number[]) => void
}

export function BuyerDragConfirmDialog({
  open,
  onOpenChange,
  buyerName,
  stageName,
  properties,
  onConfirm,
}: Props) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set(properties.map((p) => p.propertyEntityId)))

  // Reset checkboxes whenever the dialog opens with a new set of properties
  const propsKey = properties.map((p) => p.propertyEntityId).join(",")
  const [lastPropsKey, setLastPropsKey] = useState(propsKey)
  if (propsKey !== lastPropsKey) {
    setLastPropsKey(propsKey)
    setChecked(new Set(properties.map((p) => p.propertyEntityId)))
  }

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleConfirm() {
    onConfirm([...checked])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="buyer-drag-confirm-dialog">
        <DialogTitle className="text-sm font-semibold">
          Move {buyerName} to {stageName}
        </DialogTitle>
        <p className="text-xs text-muted-foreground">Select which properties to move:</p>
        <div className="space-y-2">
          {properties.map((p) => (
            <div key={p.propertyEntityId} className="flex items-center gap-2">
              <Checkbox
                id={`drag-prop-${p.propertyEntityId}`}
                data-testid={`buyer-drag-confirm-prop--${p.propertyEntityId}`}
                checked={checked.has(p.propertyEntityId)}
                onCheckedChange={() => toggle(p.propertyEntityId)}
              />
              <Label
                htmlFor={`drag-prop-${p.propertyEntityId}`}
                className="text-sm font-normal leading-snug"
              >
                {p.streetAddress}, {p.suburb}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" data-testid="buyer-drag-confirm-cancel" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" data-testid="buyer-drag-confirm-submit" disabled={checked.size === 0} onClick={handleConfirm}>
            Confirm Move
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
