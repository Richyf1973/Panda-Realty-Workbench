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

import type { TenantDialogState, TenantFormState } from "./property-tenant-types"

interface PropertyTenantDialogProps {
  dialog: TenantDialogState
  form: TenantFormState
  setForm: React.Dispatch<React.SetStateAction<TenantFormState>>
  closeDialog: () => void
  saveTenant: () => Promise<void>
}

export function PropertyTenantDialog({
  dialog,
  form,
  setForm,
  closeDialog,
  saveTenant,
}: PropertyTenantDialogProps) {
  const isEdit = dialog.tenant != null

  return (
    <Dialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) closeDialog()
      }}
    >
      <DialogContent className="max-w-2xl" data-testid="property-tenant-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tenant" : "Add Tenant"}</DialogTitle>
        </DialogHeader>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy"
          data-testid="admin-entity-crud-dialog-body--create--entities"
        >
          <fieldset
            disabled={dialog.saving}
            data-testid="admin-entity-crud-form-body-fieldset--entities"
            className="min-h-0 min-w-0 flex flex-1 flex-col border-0 p-0"
          >
            <legend className="sr-only">Tenant fields</legend>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              {/* Row 1: Name + Entity category */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-name">Name *</Label>
                <Input
                  id="ptf-name"
                  value={form.entityName}
                  onChange={(e) => setForm((f) => ({ ...f, entityName: e.target.value }))}
                  placeholder="Full name"
                  data-testid="property-tenant-dialog-name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-entity-category">Entity category *</Label>
                <Select value="3" disabled>
                  <SelectTrigger id="ptf-entity-category" data-testid="property-tenant-dialog-entity-category">
                    <SelectValue>Tenant</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2: Email + Contact number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-email">Email</Label>
                <Input
                  id="ptf-email"
                  type="email"
                  value={form.emailAddress}
                  onChange={(e) => setForm((f) => ({ ...f, emailAddress: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-phone">Contact number</Label>
                <Input
                  id="ptf-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>

              {/* Row 3: Address / Suburb / State / Postcode */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-address">Address</Label>
                <Input
                  id="ptf-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Address"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-suburb">Suburb</Label>
                <Input
                  id="ptf-suburb"
                  value={form.esuburb}
                  onChange={(e) => setForm((f) => ({ ...f, esuburb: e.target.value }))}
                  placeholder="Suburb"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-state">State</Label>
                <Input
                  id="ptf-state"
                  value={form.estate}
                  onChange={(e) => setForm((f) => ({ ...f, estate: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ptf-postcode">Postcode</Label>
                <Input
                  id="ptf-postcode"
                  value={form.epostcode}
                  onChange={(e) => setForm((f) => ({ ...f, epostcode: e.target.value }))}
                  placeholder="Postcode"
                />
              </div>

              {/* Row 4: Notes (full width) */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="ptf-notes">Notes</Label>
                <Textarea
                  id="ptf-notes"
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
          {isEdit ? (
            <Button
              type="button"
              disabled={dialog.saving}
              onClick={() => void saveTenant()}
              data-testid="property-tenant-dialog-save"
            >
              {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={dialog.saving}
                onClick={() => void saveTenant()}
                data-testid="property-tenant-dialog-create-and-close"
              >
                {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create & Close"}
              </Button>
              <Button
                type="button"
                disabled={dialog.saving}
                onClick={() => void saveTenant()}
                data-testid="property-tenant-dialog-save"
              >
                {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
