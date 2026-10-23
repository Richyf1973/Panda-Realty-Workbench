"use client"

import { useState } from "react"
import { Plus, Users } from "lucide-react"

import { Button } from "@repo/ui/button"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"

import { PropertyEntityNotesDialog } from "./property-entity-notes-dialog"
import { GmailComposeDialog } from "./gmail-compose-dialog"
import { PropertyContactDeleteDialog } from "./property-contact-delete-dialog"
import { PropertyContactDialog } from "./property-contact-dialog"
import { ContactRow } from "./property-contact-row"
import { ContactSearchCombobox } from "./property-contacts-search-combobox"
import { PropertyEntityFilesDialog } from "./property-entity-files-dialog"
import { useEntityPanelComposeDialog } from "./use-entity-panel-compose-dialog"
import { usePropertyContacts } from "./use-property-contacts"

interface PropertyContactsPanelProps {
  propertyListId: string | null
  variant: "create" | "edit"
  propertyAddress: string
}

export function PropertyContactsPanel({ propertyListId, variant, propertyAddress }: PropertyContactsPanelProps) {
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
  const [addNoteDialog, setAddNoteDialog] = useState<{ open: boolean; propertyEntityId: number | null; entityName: string }>({
    open: false,
    propertyEntityId: null,
    entityName: "",
  })
  const [reminderDialog, setReminderDialog] = useState<{ open: boolean; propertyEntityId: number | null }>({ open: false, propertyEntityId: null })
  const [filesDialog, setFilesDialog] = useState<{ open: boolean; propertyEntityId: number | null; entityName: string }>({
    open: false,
    propertyEntityId: null,
    entityName: "",
  })

  const {
    contacts,
    loading,
    loadError,
    categories,
    dialog,
    setDialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    openEditDialog,
    closeDialog,
    saveContact,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    linking,
    linkError,
    linkExistingContact,
    clearLinkError,
  } = usePropertyContacts({ propertyListId: validId, variant })

  if (variant === "create") {
    return (
      <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground px-2">
        Save the property first to manage contacts.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {loading
            ? "Loading…"
            : contacts.length === 0
              ? "No contacts yet"
              : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openAddDialog}
          disabled={loading}
          data-testid="property-contacts-add-new"
        >
          <Plus className="h-4 w-4" />
          Add new
        </Button>
      </div>

      <ContactSearchCombobox
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        searchLoading={searchLoading}
        linking={linking}
        linkError={linkError}
        clearLinkError={clearLinkError}
        onSelect={linkExistingContact}
      />

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No contacts added yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {contacts.map((c) => (
            <ContactRow
              key={c.propertyEntityId}
              contact={c}
              propertyListId={validId}
              onCompose={openNewCompose}
              onReply={(draft) => openReplyCompose(c.entityName ?? "", draft)}
              onForward={openForwardCompose}
              onAddEvent={() =>
                setMeetingDialog({
                  open: true,
                  defaultTitle: `Meeting with ${c.entityName ?? "contact"}`,
                })}
              onAddNote={() => setAddNoteDialog({ open: true, propertyEntityId: c.propertyEntityId, entityName: c.entityName ?? "" })}
              onAddReminder={() => setReminderDialog({ open: true, propertyEntityId: c.propertyEntityId })}
              onFiles={() => setFilesDialog({ open: true, propertyEntityId: c.propertyEntityId, entityName: c.entityName ?? "" })}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
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
      <PropertyContactDialog
        dialog={dialog}
        form={form}
        categories={categories}
        setForm={setForm}
        closeDialog={closeDialog}
        saveContact={saveContact}
        propertyListId={validId}
      />
      <PropertyContactDeleteDialog
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
      <PropertyEntityNotesDialog
        open={addNoteDialog.open}
        onOpenChange={(open) => setAddNoteDialog((prev) => ({ ...prev, open }))}
        propertyEntityId={addNoteDialog.propertyEntityId}
        entityName={addNoteDialog.entityName}
      />
      {validId != null && reminderDialog.open && (
        <AddReminderDialog
          open={reminderDialog.open}
          onOpenChange={(open) => setReminderDialog((prev) => ({ ...prev, open }))}
          propertyListId={validId}
          buyers={[]}
          onAdded={() => undefined}
        />
      )}
    </div>
  )
}
