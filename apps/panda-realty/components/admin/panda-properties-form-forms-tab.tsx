"use client"

import { useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { PropertyFormSendDialog } from "@/components/admin/property-form-send-dialog"
import { PropertyFormSendLinkDialog } from "@/components/admin/property-form-send-link-dialog"
import { PropertyFormHistoryEditDialog } from "@/components/admin/property-form-history-edit-dialog"
import { PropertyFormHistoryResendDialog } from "@/components/admin/property-form-history-resend-dialog"

import { useFormsTab } from "./use-forms-tab"
import { usePropertyFormHistoryEdit } from "./use-property-form-history-edit"
import { usePropertyFormHistoryResend } from "./use-property-form-history-resend"
import { PropertyFormsList } from "./property-forms-list"
import { PropertyFormsSendHistory } from "./property-forms-send-history"

export function PandaPropertiesFormFormsTab({
  propertyListId,
  propertyAddress,
}: {
  propertyListId: string | null
  propertyAddress?: string
}) {
  const listIdNum = propertyListId != null ? Number(propertyListId) : NaN
  const hasSavedProperty = Number.isFinite(listIdNum) && listIdNum > 0

  const fileInputId = useId()
  const tabRootRef = useRef<HTMLDivElement>(null)
  const [fileInputPortalHost, setFileInputPortalHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el = tabRootRef.current?.closest("[data-slot='dialog-content']") as HTMLElement | null
    setFileInputPortalHost(el ?? document.body)
  }, [])

  const {
    forms,
    loadingForms,
    sendHistory,
    loadingHistory,
    sendDialog,
    sendLinkDialog,
    loadHistory,
    openSendDialog,
    closeSendDialog,
    openSendLinkDialog,
    closeSendLinkDialog,
    uploading,
    uploadPercent,
    uploadingFileName,
    uploadError,
    retryFile,
    handleFileInput,
    handleRetry,
  } = useFormsTab({ listIdNum, hasSavedProperty })

  const historyEdit = usePropertyFormHistoryEdit({ onEdited: () => void loadHistory() })
  const historyResend = usePropertyFormHistoryResend()

  if (!hasSavedProperty) {
    return (
      <div className="p-4">
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Save the property first, then manage forms on the Forms tab.
        </p>
      </div>
    )
  }

  return (
    <div ref={tabRootRef} className="flex flex-col gap-4 p-4" data-testid="panda-properties-form-forms-tab">
      {fileInputPortalHost &&
        createPortal(
          <input
            id={fileInputId}
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />,
          fileInputPortalHost,
        )}

      <PropertyFormsList
        loadingForms={loadingForms}
        forms={forms}
        uploading={uploading}
        uploadPercent={uploadPercent}
        uploadingFileName={uploadingFileName}
        uploadError={uploadError}
        retryFile={retryFile}
        fileInputId={fileInputId}
        onRetry={handleRetry}
        onSendDialog={openSendDialog}
        onSendLinkDialog={openSendLinkDialog}
      />

      <PropertyFormsSendHistory
        loadingHistory={loadingHistory}
        sendHistory={sendHistory}
        onEdit={historyEdit.openEdit}
        onResend={historyResend.openResend}
      />

      <PropertyFormSendDialog
        open={sendDialog.open}
        form={sendDialog.form}
        propertyListId={listIdNum}
        propertyAddress={propertyAddress}
        onClose={closeSendDialog}
        onSent={() => void loadHistory()}
      />

      <PropertyFormSendLinkDialog
        open={sendLinkDialog.open}
        form={sendLinkDialog.form}
        propertyListId={listIdNum}
        onClose={closeSendLinkDialog}
        onSent={() => void loadHistory()}
      />

      {historyEdit.editRow && (
        <PropertyFormHistoryEditDialog
          row={historyEdit.editRow}
          saving={historyEdit.saving}
          error={historyEdit.error}
          onClose={historyEdit.closeEdit}
          onSubmit={(values) => void historyEdit.submitEdit(values)}
        />
      )}

      {historyResend.resendRow && (
        <PropertyFormHistoryResendDialog
          row={historyResend.resendRow}
          emails={historyResend.emails}
          message={historyResend.message}
          sending={historyResend.sending}
          error={historyResend.error}
          hasValidEmail={historyResend.hasValidEmail}
          onClose={historyResend.closeResend}
          onSetEmail={historyResend.setEmail}
          onAddEmail={historyResend.addEmail}
          onSetMessage={historyResend.setMessage}
          onSubmit={() => void historyResend.submitResend()}
        />
      )}
    </div>
  )
}
