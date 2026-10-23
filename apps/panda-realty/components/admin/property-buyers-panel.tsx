"use client"

import { useCallback, useEffect, useState } from "react"
import { Users } from "lucide-react"

import { useOptionalAdminNestedEntityCrud } from "@repo/admin/components/admin/admin-nested-entity-crud-context"
import { Button } from "@repo/ui/button"

import { emitGoogleContactsPatchWarnings } from "@/lib/google-contacts-warning-client"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"

import { PropertyBuyerPanelDeleteDialog } from "./property-buyer-panel-delete-dialog"
import { PropertyBuyerPanelDialog } from "./property-buyer-panel-dialog"
import { BuyerOwnerRow } from "./property-buyer-owner-row"
import { usePropertyBuyersPanel } from "./use-property-buyers-panel"

interface PropertyBuyersPanelProps {
  propertyListId: string | null
  variant: "create" | "edit"
  propertyAddress: string
}

export function PropertyBuyersPanel({ propertyListId, variant }: PropertyBuyersPanelProps) {
  const numericId = propertyListId != null ? parseInt(propertyListId, 10) : null
  const validId = numericId != null && Number.isFinite(numericId) && numericId > 0 ? numericId : null

  const nestedCrud = useOptionalAdminNestedEntityCrud()
  const [linkError, setLinkError] = useState<string | null>(null)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)

  useEffect(() => {
    if (validId == null) return
    let cancelled = false
    void fetch("/api/admin/calendar/status")
      .then((r) => r.json())
      .then((d: { connected: boolean }) => { if (!cancelled) setCalendarConnected(d.connected) })
      .catch(() => { if (!cancelled) setCalendarConnected(false) })
    return () => { cancelled = true }
  }, [validId])

  const {
    buyers,
    loading,
    loadError,
    dialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    closeDialog,
    saveBuyer,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    refreshBuyers,
    handleSetPrimaryPhone,
    handleSetPrimaryEmail,
  } = usePropertyBuyersPanel({ propertyListId: validId, variant })

  const handleAddNew = useCallback(() => {
    setLinkError(null)
    if (nestedCrud && validId != null) {
      nestedCrud.openNestedEntityCreate({
        slug: "entities",
        seedValues: { entityCategoryId: "1" },
        overrideAddCardTitle: "Add Buyer",
        createPrimarySubmitLabel: "Create & Edit",
        onSuccess: async (row) => {
          const entityId = String(row.entityId ?? "").trim()
          if (!entityId) return
          if (nestedCrud != null) {
            nestedCrud.promoteNestedCreateDialogToEditFromApiRow(row)
          }
          try {
            const linkRes = await fetch("/api/admin/property-entities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entityId, propertyListId: String(validId), isOriginalOwner: "false" }),
            })
            if (!linkRes.ok) {
              const data = (await linkRes.json().catch(() => ({}))) as { error?: string }
              setLinkError(data.error ?? `Failed to link buyer to property (${linkRes.status})`)
              return
            }
            const linkData = (await linkRes.json().catch(() => null)) as Record<string, unknown> | null
            emitGoogleContactsPatchWarnings(linkData)
            await refreshBuyers()
          } catch {
            setLinkError("Failed to link buyer to property.")
          }
        },
      })
    } else {
      openAddDialog()
    }
  }, [nestedCrud, validId, refreshBuyers, openAddDialog])

  if (variant === "create") {
    return (
      <div className="flex h-24 items-center justify-center px-2 text-center text-sm text-muted-foreground">
        Save the property first to manage contacts.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div
        className="hidden gap-x-4 md:grid md:grid-cols-4"
        aria-hidden={true}
        data-testid="property-buyer-owner-row-column-headers"
      >
        <span className="text-xs font-medium text-muted-foreground">Name</span>
        <span className="text-xs font-medium text-muted-foreground">Address</span>
        <span className="text-xs font-medium text-muted-foreground">Phone</span>
        <span className="text-xs font-medium text-muted-foreground">Email</span>
      </div>

      {linkError && (
        <p className="text-sm text-destructive" role="alert">{linkError}</p>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : buyers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No buyers added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-4">
          {buyers.map((buyer) => (
            <BuyerOwnerRow
              key={buyer.propertyEntityId}
              buyer={buyer}
              propertyListId={validId}
              calendarConnected={calendarConnected}
              onDelete={() => openDeleteDialog(buyer)}
              onSetPrimaryPhone={handleSetPrimaryPhone}
              onSetPrimaryEmail={handleSetPrimaryEmail}
              onOpenProfile={
                nestedCrud
                  ? () => nestedCrud.openNestedEntityEdit({
                      slug: "entities",
                      rowId: String(buyer.entityId),
                      nestedEditUiContext: validId != null ? { sourcePropertyListId: String(validId) } : undefined,
                    })
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <div className="md:col-span-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleAddNew}
          disabled={loading}
          data-testid="property-buyers-panel-add-new"
        >
          + Add buyer
        </Button>
      </div>

      <PropertyBuyerPanelDialog
        dialog={dialog}
        form={form}
        setForm={setForm}
        closeDialog={closeDialog}
        saveBuyer={saveBuyer}
      />
      <PropertyBuyerPanelDeleteDialog
        deleteDialog={deleteDialog}
        closeDeleteDialog={closeDeleteDialog}
        confirmDelete={confirmDelete}
      />
    </div>
  )
}
