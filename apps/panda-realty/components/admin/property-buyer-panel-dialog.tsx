"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"
import { Textarea } from "@repo/ui/textarea"

import type { BuyerPanelDialogState, BuyerPanelFormState } from "./property-buyer-panel-types"

interface PropertyBuyerPanelDialogProps {
  dialog: BuyerPanelDialogState
  form: BuyerPanelFormState
  setForm: React.Dispatch<React.SetStateAction<BuyerPanelFormState>>
  closeDialog: () => void
  saveBuyer: () => Promise<void>
}

export function PropertyBuyerPanelDialog({
  dialog,
  form,
  setForm,
  closeDialog,
  saveBuyer,
}: PropertyBuyerPanelDialogProps) {
  return (
    <Dialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) closeDialog()
      }}
    >
      <DialogContent className="max-w-2xl" data-testid="property-buyer-panel-dialog">
        <DialogHeader>
          <DialogTitle>Add Buyer</DialogTitle>
        </DialogHeader>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy"
          data-testid="property-buyer-panel-dialog-body"
        >
          <fieldset
            disabled={dialog.saving}
            data-testid="property-buyer-panel-dialog-fieldset"
            className="min-h-0 min-w-0 flex flex-1 flex-col border-0 p-0"
          >
            <legend className="sr-only">Buyer fields</legend>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              {/* Row 1: Name + Entity category */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-name">Name *</Label>
                <Input
                  id="pbf-name"
                  value={form.entityName}
                  onChange={(e) => setForm((f) => ({ ...f, entityName: e.target.value }))}
                  placeholder="Full name"
                  data-testid="property-buyer-panel-dialog-name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-entity-category">Entity category *</Label>
                <Select value="1" disabled>
                  <SelectTrigger id="pbf-entity-category" data-testid="property-buyer-panel-dialog-entity-category">
                    <SelectValue>Buyer</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2: Email + Contact number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-email">Email</Label>
                <Input
                  id="pbf-email"
                  type="email"
                  value={form.emailAddress}
                  onChange={(e) => setForm((f) => ({ ...f, emailAddress: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-phone">Contact number</Label>
                <Input
                  id="pbf-phone"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>

              {/* Row 3: Address / Suburb / State / Postcode */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-address">Address</Label>
                <Input
                  id="pbf-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Address"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-suburb">Suburb</Label>
                <Input
                  id="pbf-suburb"
                  value={form.esuburb}
                  onChange={(e) => setForm((f) => ({ ...f, esuburb: e.target.value }))}
                  placeholder="Suburb"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-state">State</Label>
                <Input
                  id="pbf-state"
                  value={form.estate}
                  onChange={(e) => setForm((f) => ({ ...f, estate: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pbf-postcode">Postcode</Label>
                <Input
                  id="pbf-postcode"
                  value={form.epostcode}
                  onChange={(e) => setForm((f) => ({ ...f, epostcode: e.target.value }))}
                  placeholder="Postcode"
                />
              </div>

              {/* Row 4: Notes (full width) */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="pbf-notes">Notes</Label>
                <Textarea
                  id="pbf-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes"
                  rows={3}
                />
              </div>

              {dialog.saveError && (
                <p className="col-span-2 text-sm text-destructive" role="alert">
                  {dialog.saveError}
                </p>
              )}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={dialog.saving}
            onClick={closeDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={dialog.saving}
            onClick={() => void saveBuyer()}
            data-testid="property-buyer-panel-dialog-create-and-close"
          >
            {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create & Close"}
          </Button>
          <Button
            type="button"
            disabled={dialog.saving}
            onClick={() => void saveBuyer()}
            data-testid="property-buyer-panel-dialog-save"
          >
            {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
