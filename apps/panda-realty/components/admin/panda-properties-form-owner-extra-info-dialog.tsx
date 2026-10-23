"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"

import { FieldText } from "./panda-properties-form-fields"
import type { FormLike } from "./panda-properties-dialog-form-types"

interface OwnerExtraInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: FormLike
  ownerNum: 1 | 2 | 3
  prefix: "owner1" | "owner2" | "owner3"
}

export function OwnerExtraInfoDialog({
  open,
  onOpenChange,
  form,
  ownerNum,
  prefix,
}: OwnerExtraInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Owner {ownerNum}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <FieldText
            form={form}
            name={`${prefix}mobile`}
            label={`Owner ${ownerNum} mobile`}
            placeholder="Mobile"
            type="tel"
            autoComplete="tel"
            contactLink="tel"
          />
          <FieldText
            form={form}
            name={`${prefix}abn`}
            label={`Owner ${ownerNum} ABN`}
            placeholder="ABN"
          />
          <FieldText
            form={form}
            name={`${prefix}nameLine2`}
            label={`Owner ${ownerNum} name (line 2)`}
            placeholder="Trading As / Company Name"
          />
          <FieldText
            form={form}
            name={`${prefix}acn`}
            label={`Owner ${ownerNum} ACN`}
            placeholder="ACN"
          />
          <FieldText
            form={form}
            name={`${prefix}gstRegistered`}
            label={`Owner ${ownerNum} GST registered`}
            placeholder="Yes / No"
          />
          <FieldText
            form={form}
            name={`${prefix}address2`}
            label={`Owner ${ownerNum} address (line 2)`}
            placeholder="Unit / Suite"
          />
          <FieldText
            form={form}
            name={`${prefix}fax`}
            label={`Owner ${ownerNum} fax`}
            placeholder="Fax"
            type="tel"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Changes are saved when you save the property.
        </p>
      </DialogContent>
    </Dialog>
  )
}
