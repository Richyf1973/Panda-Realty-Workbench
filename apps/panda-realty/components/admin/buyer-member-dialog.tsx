"use client"

import { CalendarIcon, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Checkbox } from "@repo/ui/checkbox"
import { Calendar } from "@repo/ui/calendar"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/popover"
import { cn } from "@repo/ui/utils"
import {
  adminEntityTimestampCalendarSelectionToUtcIso,
  adminEntityTimestampFormStringToPickerDate,
} from "@repo/admin/admin-entity-crud-timestamp-form"

import {
  formatViewingDate,
  type MemberDialogState,
  type MemberFormState,
} from "./buyer-member-types"

interface BuyerMemberDialogProps {
  memberDialog: MemberDialogState
  form: MemberFormState
  setForm: React.Dispatch<React.SetStateAction<MemberFormState>>
  setMemberDialog: React.Dispatch<React.SetStateAction<MemberDialogState>>
  closeMemberDialog: () => void
  saveMember: () => Promise<void>
}

export function BuyerMemberDialog({
  memberDialog,
  form,
  setForm,
  setMemberDialog,
  closeMemberDialog,
  saveMember,
}: BuyerMemberDialogProps) {
  const selectedDate = adminEntityTimestampFormStringToPickerDate(form.scheduledViewingDate)

  return (
    <Dialog
      open={memberDialog.open}
      onOpenChange={(open) => {
        if (!open) closeMemberDialog()
      }}
    >
      <DialogContent className="max-w-md" data-testid="buyer-member-dialog">
        <DialogHeader>
          <DialogTitle>
            {memberDialog.member ? "Edit member" : "Add member"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bmf-name">Name *</Label>
            <Input
              id="bmf-name"
              value={form.memberName}
              onChange={(e) =>
                setForm((f) => ({ ...f, memberName: e.target.value }))
              }
              placeholder="Full name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bmf-phone">Phone</Label>
            <Input
              id="bmf-phone"
              value={form.memberPhoneNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, memberPhoneNumber: e.target.value }))
              }
              placeholder="Phone number"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bmf-email">Email</Label>
            <Input
              id="bmf-email"
              type="email"
              value={form.memberEmailAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, memberEmailAddress: e.target.value }))
              }
              placeholder="Email address"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bmf-address">Address</Label>
            <Input
              id="bmf-address"
              value={form.memberAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, memberAddress: e.target.value }))
              }
              placeholder="Address"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bmf-property-to-sell">Property to sell</Label>
            <Input
              id="bmf-property-to-sell"
              value={form.propertyToSellAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, propertyToSellAddress: e.target.value }))
              }
              placeholder="Address of property to be sold"
              data-testid="buyer-member-dialog-property-to-sell-address"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="bmf-rep"
              checked={form.isBuyersRepresentative}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, isBuyersRepresentative: v === true }))
              }
              data-testid="buyer-member-dialog-representative"
            />
            <Label htmlFor="bmf-rep" className="cursor-pointer font-normal">
              Buyer&apos;s representative
            </Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Scheduled viewing</Label>
            <Popover
              open={memberDialog.calendarOpen}
              onOpenChange={(open) =>
                setMemberDialog((prev) => ({ ...prev, calendarOpen: open }))
              }
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start gap-2 px-2.5 font-normal",
                    !form.scheduledViewingDate && "text-muted-foreground",
                  )}
                  data-testid="buyer-member-dialog-scheduled-viewing-trigger"
                >
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  {form.scheduledViewingDate
                    ? formatViewingDate(form.scheduledViewingDate)
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-200 w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setForm((f) => ({
                      ...f,
                      scheduledViewingDate: d
                        ? adminEntityTimestampCalendarSelectionToUtcIso(d)
                        : "",
                    }))
                    setMemberDialog((prev) => ({
                      ...prev,
                      calendarOpen: false,
                    }))
                  }}
                  initialFocus
                />
                {form.scheduledViewingDate && (
                  <div className="border-t p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => {
                        setForm((f) => ({ ...f, scheduledViewingDate: "" }))
                        setMemberDialog((prev) => ({
                          ...prev,
                          calendarOpen: false,
                        }))
                      }}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          {memberDialog.saveError && (
            <p className="text-sm text-destructive">{memberDialog.saveError}</p>
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
            data-testid="buyer-member-dialog-save"
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
