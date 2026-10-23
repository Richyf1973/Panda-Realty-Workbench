"use client"

import type { MutableRefObject } from "react"

import { Button } from "@repo/ui/button"
import { DialogFooter } from "@repo/ui/dialog"
import { cn } from "@repo/ui/utils"

import type { AdminEntitySlug } from "../../admin-entity-slug-client"

export type AdminEntityCreateCrudPendingAfterSuccess =
  | "keepOpen"
  | "close"
  | "createAnother"
  | "unset"

type WhichSubmit = "addNew" | "close" | "create"

export function AdminEntityCreateCrudDialogFooter({
  slug,
  isCompact,
  showFooterCancel,
  showCreateSubmit,
  showCreateAndAddNew,
  whichSubmit,
  createFooterLocked,
  createSubmitExtraLocked = false,
  createMutationInFlight,
  primaryCreateIdleLabel,
  pendingCreateAfterSuccessRef,
  onCancel,
  onRequestSubmit,
}: {
  slug: AdminEntitySlug
  isCompact: boolean
  showFooterCancel: boolean
  showCreateSubmit: boolean
  showCreateAndAddNew: boolean
  whichSubmit: WhichSubmit
  createFooterLocked: boolean
  createSubmitExtraLocked?: boolean
  createMutationInFlight: boolean
  primaryCreateIdleLabel: string
  pendingCreateAfterSuccessRef: MutableRefObject<AdminEntityCreateCrudPendingAfterSuccess>
  onCancel: () => void
  onRequestSubmit: () => void
}) {
  if (!showFooterCancel && !showCreateSubmit) return null

  return (
    <DialogFooter
      className={cn(
        "mx-0 mb-0 shrink-0 rounded-none border-t bg-muted/50",
        isCompact ? "gap-2 px-3 py-2" : "px-4 py-3",
      )}
      data-testid={`admin-entity-crud-dialog-footer--create--${slug}`}
    >
      {showFooterCancel ? (
        <Button
          type="button"
          variant="outline"
          size={isCompact ? "sm" : "default"}
          disabled={createFooterLocked}
          data-testid={`admin-entity-crud-dialog-cancel--${slug}`}
          onClick={onCancel}
        >
          Cancel
        </Button>
      ) : null}
      {showCreateSubmit ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-2",
            !showFooterCancel && "w-full",
          )}
          data-testid={`admin-entity-crud-dialog-footer-actions--create--${slug}`}
        >
          {showCreateAndAddNew ? (
            <Button
              type={whichSubmit === "addNew" ? "submit" : "button"}
              variant={whichSubmit === "addNew" ? "default" : "outline"}
              size={isCompact ? "sm" : "default"}
              disabled={createFooterLocked || createSubmitExtraLocked}
              data-testid={`admin-entity-create-and-add-new--${slug}`}
              onMouseDown={() => {
                pendingCreateAfterSuccessRef.current = "createAnother"
              }}
              onClick={() => {
                if (whichSubmit === "addNew") return
                onRequestSubmit()
              }}
            >
              {createMutationInFlight ? "Creating…" : "Create & add new"}
            </Button>
          ) : null}
          <Button
            type={whichSubmit === "close" ? "submit" : "button"}
            variant={whichSubmit === "close" ? "default" : "outline"}
            size={isCompact ? "sm" : "default"}
            disabled={createFooterLocked || createSubmitExtraLocked}
            data-testid={`admin-entity-create-and-close--${slug}`}
            onMouseDown={() => {
              pendingCreateAfterSuccessRef.current = "close"
            }}
            onClick={() => {
              if (whichSubmit === "close") return
              onRequestSubmit()
            }}
          >
            {createMutationInFlight ? "Creating…" : "Create & Close"}
          </Button>
          <Button
            type={whichSubmit === "create" ? "submit" : "button"}
            variant={whichSubmit === "create" ? "default" : "outline"}
            size={isCompact ? "sm" : "default"}
            disabled={createFooterLocked || createSubmitExtraLocked}
            data-testid={`admin-entity-create-submit--${slug}`}
            onMouseDown={() => {
              pendingCreateAfterSuccessRef.current = "keepOpen"
            }}
            onClick={() => {
              if (whichSubmit === "create") return
              onRequestSubmit()
            }}
          >
            {createMutationInFlight ? "Creating…" : primaryCreateIdleLabel}
          </Button>
        </div>
      ) : null}
    </DialogFooter>
  )
}
