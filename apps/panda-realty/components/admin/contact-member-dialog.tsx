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

import type { ContactMemberDialogState, ContactMemberFormState } from "./contact-member-types"

interface ContactMemberDialogProps {
  memberDialog: ContactMemberDialogState
  form: ContactMemberFormState
  setForm: React.Dispatch<React.SetStateAction<ContactMemberFormState>>
  closeMemberDialog: () => void
  saveMember: () => Promise<void>
}

export function ContactMemberDialog({
  memberDialog,
  form,
  setForm,
  closeMemberDialog,
  saveMember,
}: ContactMemberDialogProps) {
  return (
    <Dialog
      open={memberDialog.open}
      onOpenChange={(open) => {
        if (!open) closeMemberDialog()
      }}
    >
      <DialogContent className="max-w-md" data-testid="contact-member-dialog">
        <DialogHeader>
          <DialogTitle>
            {memberDialog.member ? "Edit representative" : "Add representative"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cmf-name">Name *</Label>
            <Input
              id="cmf-name"
              value={form.memberName}
              onChange={(e) => setForm((f) => ({ ...f, memberName: e.target.value }))}
              placeholder="Full name"
              data-testid="contact-member-dialog-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cmf-phone">Phone</Label>
            <Input
              id="cmf-phone"
              value={form.memberPhoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, memberPhoneNumber: e.target.value }))}
              placeholder="Phone number"
              data-testid="contact-member-dialog-phone"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cmf-email">Email</Label>
            <Input
              id="cmf-email"
              type="email"
              value={form.memberEmailAddress}
              onChange={(e) => setForm((f) => ({ ...f, memberEmailAddress: e.target.value }))}
              placeholder="Email address"
              data-testid="contact-member-dialog-email"
            />
          </div>
          {memberDialog.saveError && (
            <p className="text-sm text-destructive" role="alert">
              {memberDialog.saveError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={memberDialog.saving}
            onClick={closeMemberDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={memberDialog.saving}
            onClick={() => void saveMember()}
            data-testid="contact-member-dialog-save"
          >
            {memberDialog.saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
