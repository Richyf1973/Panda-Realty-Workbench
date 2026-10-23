"use client"

import { useState } from "react"

import { useEntityPanelComposeDialog } from "./use-entity-panel-compose-dialog"
import { Plus, Users } from "lucide-react"

import { Button } from "@repo/ui/button"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"

import { AddBuyerNoteDialog } from "./add-buyer-note-dialog"
import { GmailComposeDialog } from "./gmail-compose-dialog"
import { PropertyTenantDeleteDialog } from "./property-tenant-delete-dialog"
import { PropertyTenantDialog } from "./property-tenant-dialog"
import { EntityCardRow } from "./property-entity-card-row"
import { PropertyEntityFilesDialog } from "./property-entity-files-dialog"
import type { PropertyTenant } from "./property-tenant-types"
import { usePropertyTenants } from "./use-property-tenants"

interface PropertyTenantsPanelProps {
  propertyListId: string | null
  variant: "create" | "edit"
  propertyAddress: string
}

export function PropertyTenantsPanel({ propertyListId, variant, propertyAddress }: PropertyTenantsPanelProps) {
  const numericId = propertyListId != null ? parseInt(propertyListId, 10) : null
  const validId = numericId != null && Number.isFinite(numericId) && numericId > 0 ? numericId : null

  const { composeDialog, setComposeDialog, openNewCompose, openReplyCompose, forwardDraft, openForwardCompose, closeForwardCompose } = useEntityPanelComposeDialog(propertyAddress)
  const [meetingDialog, setMeetingDialog] = useState<{
    open: boolean
    defaultTitle: string
  }>({
    open: false,
    defaultTitle: "",
  })
  const [addNoteDialog, setAddNoteDialog] = useState<{ open: boolean; propertyEntityId: number | null }>({
    open: false,
    propertyEntityId: null,
  })
  const [filesDialog, setFilesDialog] = useState<{ open: boolean; propertyEntityId: number | null; entityName: string }>({
    open: false,
    propertyEntityId: null,
    entityName: "",
  })

  const {
    tenants,
    loading,
    loadError,
    dialog,
    setDialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    openEditDialog,
    closeDialog,
    saveTenant,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = usePropertyTenants({ propertyListId: validId, variant })

  if (variant === "create") {
    return (
      <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground px-2">
        Save the property first to manage tenants.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {loading
            ? "Loading…"
            : tenants.length === 0
              ? "No tenants yet"
              : `${tenants.length} tenant${tenants.length !== 1 ? "s" : ""}`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openAddDialog}
          disabled={loading}
          data-testid="property-tenants-add-new"
        >
          <Plus className="h-4 w-4" />
          Add new
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No tenants added yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tenants.map((t) => (
            <EntityCardRow
              key={t.propertyEntityId}
              propertyEntityId={t.propertyEntityId}
              entityId={t.entityId}
              entityName={t.entityName}
              phoneNumber={t.phone}
              emailAddress={t.emailAddress}
              address={t.address}
              testidPrefix="property-tenant"
              propertyListId={validId}
              onCompose={openNewCompose}
              onReply={(draft) => openReplyCompose(t.entityName, draft)}
              onForward={openForwardCompose}
              onAddEvent={() =>
                setMeetingDialog({
                  open: true,
                  defaultTitle: `Meeting with ${t.entityName}`,
                })}
              onAddNote={() => setAddNoteDialog({ open: true, propertyEntityId: t.propertyEntityId })}
              onFiles={() => setFilesDialog({ open: true, propertyEntityId: t.propertyEntityId, entityName: t.entityName })}
              onEdit={() => openEditDialog(t)}
              onDelete={() => openDeleteDialog(t)}
            />
          ))}
        </ul>
      )}

      <PropertyEntityFilesDialog
        propertyEntityId={filesDialog.propertyEntityId}
        entityName={filesDialog.entityName}
        open={filesDialog.open}
        onOpenChange={(open) => setFilesDialog((prev) => ({ ...prev, open }))}
      />
      <PropertyTenantDialog
        dialog={dialog}
        form={form}
        setForm={setForm}
        closeDialog={closeDialog}
        saveTenant={saveTenant}
      />
      <PropertyTenantDeleteDialog
        deleteDialog={deleteDialog}
        closeDeleteDialog={closeDeleteDialog}
        confirmDelete={confirmDelete}
      />
      {composeDialog.open && (
        <GmailComposeDialog
          key={`${composeDialog.email}-${composeDialog.entityName}`}
          open={composeDialog.open}
          to={composeDialog.email}
          subject={composeDialog.subject}
          body={composeDialog.body}
          propertyListId={validId}
          replyContext={composeDialog.replyContext}
          onClose={() =>
            setComposeDialog({ open: false, email: "", entityName: "", subject: "", body: "" })
          }
          inline
        />
      )}
      {forwardDraft && (
        <GmailComposeDialog
          key={`forward-${forwardDraft.messageId}`}
          open={true}
          to=""
          subject=""
          body=""
          propertyListId={validId}
          forwardContext={forwardDraft}
          onClose={closeForwardCompose}
          inline
        />
      )}
      {/* buyers=[] intentional — tenant meetings have no buyer association */}
      {validId != null && (
        <AddMeetingDialog
          open={meetingDialog.open}
          onOpenChange={(open) => setMeetingDialog((prev) => ({ ...prev, open }))}
          propertyListId={validId}
          buyers={[]}
          onAdded={() => undefined}
          onSyncError={() => undefined}
          defaultTitle={meetingDialog.defaultTitle}
        />
      )}
      {addNoteDialog.propertyEntityId != null && (
        <AddBuyerNoteDialog
          open={addNoteDialog.open}
          onOpenChange={(open) => setAddNoteDialog((prev) => ({ ...prev, open }))}
          propertyEntityId={addNoteDialog.propertyEntityId}
          onSuccess={() => setAddNoteDialog({ open: false, propertyEntityId: null })}
        />
      )}
    </div>
  )
}
