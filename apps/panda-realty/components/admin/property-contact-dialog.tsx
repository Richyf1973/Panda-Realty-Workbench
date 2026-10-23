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

import { ContactBusinessSearch } from "./contact-business-search"
import { ContactMembersPanel } from "./contact-members-panel"
import type {
  ContactCategory,
  ContactDialogState,
  ContactFormState,
} from "./property-contact-types"

interface PropertyContactDialogProps {
  dialog: ContactDialogState
  form: ContactFormState
  categories: ContactCategory[]
  setForm: React.Dispatch<React.SetStateAction<ContactFormState>>
  closeDialog: () => void
  saveContact: (opts?: { keepOpen?: boolean }) => Promise<void>
  propertyListId?: number | null
}

export function PropertyContactDialog({
  dialog,
  form,
  categories,
  setForm,
  closeDialog,
  saveContact,
  propertyListId,
}: PropertyContactDialogProps) {
  const isEdit = dialog.contact != null

  return (
    <Dialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) closeDialog()
      }}
    >
      <DialogContent className="max-w-2xl flex flex-col max-h-[85vh]" data-testid="property-contact-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy">
          <fieldset
            disabled={dialog.saving}
            data-testid="property-contact-dialog-fieldset"
            className="min-h-0 min-w-0 flex flex-1 flex-col border-0 p-0"
          >
            <legend className="sr-only">Contact fields</legend>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              {/* Row 1: Name + Entity category */}
              <ContactBusinessSearch
                value={form.entityName}
                onChange={(value) => setForm((f) => ({ ...f, entityName: value }))}
                disabled={dialog.saving}
                onSelect={(result) =>
                  setForm((f) => ({
                    ...f,
                    entityName: result.name,
                    phoneNumber: result.phone,
                    emailAddress: result.email || f.emailAddress,
                    address: result.address,
                    esuburb: result.suburb,
                    estate: result.state,
                    epostcode: result.postcode,
                  }))
                }
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-entity-category">Entity category *</Label>
                <Select value="4" disabled>
                  <SelectTrigger id="pcf-entity-category" data-testid="property-contact-dialog-entity-category">
                    <SelectValue>Contact</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2: Contact category + Association */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-category">Contact category</Label>
                <Select
                  value={form.contactCategoryId || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, contactCategoryId: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger id="pcf-category" data-testid="property-contact-dialog-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.contactCategoryId} value={String(cat.contactCategoryId)}>
                        {cat.contactCategoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-association">Association</Label>
                <Select
                  value={form.association || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, association: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger id="pcf-association" data-testid="property-contact-dialog-association">
                    <SelectValue placeholder="Select association" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    <SelectItem value="Buyer">Buyer</SelectItem>
                    <SelectItem value="Seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 3: Email + Contact number */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-email">Email</Label>
                <Input
                  id="pcf-email"
                  type="email"
                  value={form.emailAddress}
                  onChange={(e) => setForm((f) => ({ ...f, emailAddress: e.target.value }))}
                  placeholder="Email address"
                  data-testid="property-contact-dialog-email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-phone">Contact number</Label>
                <Input
                  id="pcf-phone"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="Phone number"
                  data-testid="property-contact-dialog-phone"
                />
              </div>

              {/* Row 4: Address / Suburb / State / Postcode */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-address">Address</Label>
                <Input
                  id="pcf-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Address"
                  data-testid="property-contact-dialog-address"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-suburb">Suburb</Label>
                <Input
                  id="pcf-suburb"
                  value={form.esuburb}
                  onChange={(e) => setForm((f) => ({ ...f, esuburb: e.target.value }))}
                  placeholder="Suburb"
                  data-testid="property-contact-dialog-suburb"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-state">State</Label>
                <Input
                  id="pcf-state"
                  value={form.estate}
                  onChange={(e) => setForm((f) => ({ ...f, estate: e.target.value }))}
                  placeholder="State"
                  data-testid="property-contact-dialog-state"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pcf-postcode">Postcode</Label>
                <Input
                  id="pcf-postcode"
                  value={form.epostcode}
                  onChange={(e) => setForm((f) => ({ ...f, epostcode: e.target.value }))}
                  placeholder="Postcode"
                  data-testid="property-contact-dialog-postcode"
                />
              </div>

              {/* Representatives panel */}
              <div className="col-span-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Representatives</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <ContactMembersPanel
                  entityId={dialog.contact?.entityId ?? null}
                  variant={isEdit ? "edit" : "create"}
                  entityName={form.entityName}
                  propertyListId={propertyListId}
                />
              </div>

              {/* Row 5: Notes (full width) */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="pcf-notes">Notes</Label>
                <Textarea
                  id="pcf-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes"
                  rows={3}
                  data-testid="property-contact-dialog-notes"
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
              onClick={() => void saveContact()}
              data-testid="property-contact-dialog-save"
            >
              {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={dialog.saving}
                onClick={() => void saveContact()}
                data-testid="property-contact-dialog-create-and-close"
              >
                {dialog.saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Create & Close"}
              </Button>
              <Button
                type="button"
                disabled={dialog.saving}
                onClick={() => void saveContact({ keepOpen: true })}
                data-testid="property-contact-dialog-save"
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
