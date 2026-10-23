"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/dialog"

import { BuyerOfferFormSection } from "./buyer-offer-form-section"
import { PropertyEntityBuyerOffersPanel } from "./property-entity-buyer-offers-panel"

interface PropertyBuyerPanelOffersDialogProps {
  open: boolean
  propertyEntityId: number | null
  entityName: string
  onClose: () => void
}

export function PropertyBuyerPanelOffersDialog({
  open,
  propertyEntityId,
  entityName,
  onClose,
}: PropertyBuyerPanelOffersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] flex flex-col"
        data-testid="property-buyer-panel-offers-dialog"
      >
        <DialogHeader>
          <DialogTitle>{entityName ? `${entityName}'s Offers` : "Offers"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {propertyEntityId != null && (
            <>
              <BuyerOfferFormSection propertyEntityId={propertyEntityId} />
              <PropertyEntityBuyerOffersPanel propertyEntityId={propertyEntityId} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
