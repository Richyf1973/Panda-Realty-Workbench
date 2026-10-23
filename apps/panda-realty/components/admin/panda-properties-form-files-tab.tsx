"use client"

import { useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, File, FolderPlus, Loader2, RefreshCw, Trash2, Upload } from "lucide-react"

import { Button } from "@repo/ui/button"

import { PropertyFileDeleteConfirmDialog } from "@/components/admin/property-file-delete-confirm-dialog"
import { PropertyFilesList } from "@/components/admin/property-files-list"
import { DriveUploadProgress, DriveUploadError } from "@/components/admin/drive-upload-feedback"
import { formatPropertyFileBytes, PropertyFileIcon } from "@/components/admin/property-file-shared"
import { LoadingSkeleton } from "@/app/admin/properties/board/panel-shared"

import { useFilesTab } from "./use-files-tab"

const CLIENT_SOURCES = ["buyer_upload", "seller_upload"]

export function PandaPropertiesFormFilesTab({
  propertyListId,
}: {
  propertyListId: string | null
}) {
  const listIdNum = propertyListId != null ? Number(propertyListId) : NaN
  const hasSavedProperty = Number.isFinite(listIdNum) && listIdNum > 0

  const fileInputId = useId()
  const filesTabRootRef = useRef<HTMLDivElement>(null)
  const [fileInputPortalHost, setFileInputPortalHost] = useState<HTMLElement | null>(null)

  const {
    items,
    loading,
    loadError,
    folderCreating,
    folderResult,
    folderError,
    deleteDialog,
    handleCreateFolder,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    uploading,
    uploadPercent,
    uploadingFileName,
    uploadError,
    shareWarning,
    retryFile,
    handleFileInput,
    handleRetry,
    syncing,
    syncResult,
    syncError,
    lastSyncedAt,
    handleDriveSync,
  } = useFilesTab({ hasSavedProperty, listIdNum })

  /**
   * Portals the file input out of the admin edit `<fieldset disabled>` (interaction lock) but
   * must stay under `[data-slot="dialog-content"]` — Radix modal marks `document.body` inert,
   * so a body-portaled input never receives the label-driven file picker.
   */
  useLayoutEffect(() => {
    if (!hasSavedProperty) {
      setFileInputPortalHost(null)
      return
    }
    const host =
      filesTabRootRef.current?.closest<HTMLElement>("[data-slot=\"dialog-content\"]") ?? null
    setFileInputPortalHost(host)
  }, [hasSavedProperty, propertyListId])

  if (!hasSavedProperty) {
    return (
      <div
        className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground"
        data-testid="panda-properties-form-files-tab--save-first"
      >
        <p>Save the property first, then add files on the Files tab.</p>
        <p className="text-xs">The listing needs an id before uploads can be stored.</p>
      </div>
    )
  }

  const agentItems = items.filter((r) => !CLIENT_SOURCES.includes(r.source ?? ""))
  const clientItems = items.filter((r) => CLIENT_SOURCES.includes(r.source ?? ""))

  const fileInput = (
    <input
      id={fileInputId}
      type="file"
      multiple
      data-testid="panda-properties-form-files-file-input"
      aria-label="Upload property files"
      className="sr-only"
      tabIndex={-1}
      onChange={handleFileInput}
    />
  )

  return (
    <div
      ref={filesTabRootRef}
      className="flex flex-col gap-3 p-4"
      data-testid="panda-properties-form-tab--files-content"
    >
      {fileInputPortalHost ? createPortal(fileInput, fileInputPortalHost) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground" data-testid="panda-properties-form-files-count">
          {loading
            ? "Loading…"
            : items.length === 0
              ? "No files"
              : `${items.length} file${items.length !== 1 ? "s" : ""}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={folderCreating}
            onClick={handleCreateFolder}
            data-testid="panda-properties-form-files-btn--create-folder"
          >
            {folderCreating
              ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</>
              : <><FolderPlus className="h-4 w-4" />Create Drive Folder</>
            }
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={handleDriveSync}
            data-testid="panda-properties-form-files-btn--sync"
          >
            {syncing
              ? <><Loader2 className="h-4 w-4 animate-spin" />Syncing…</>
              : <><RefreshCw className="h-4 w-4" />Sync from Drive</>
            }
          </Button>
          {!uploading ? (
            <Button variant="outline" size="sm" asChild data-testid="panda-properties-form-files-btn--add">
              <label htmlFor={fileInputId} className="inline-flex cursor-pointer items-center gap-1.5">
                <Upload className="h-4 w-4" />
                Add files
              </label>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              data-testid="panda-properties-form-files-btn--add"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </Button>
          )}
        </div>
      </div>

      {lastSyncedAt && (
        <p className="text-xs text-muted-foreground" data-testid="panda-properties-form-files-last-synced">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}

      {syncResult && (
        <p className="text-xs text-green-600" data-testid="panda-properties-form-files-sync-result">
          {syncResult}
        </p>
      )}

      {syncError && (
        <p className="text-xs text-destructive" data-testid="panda-properties-form-files-sync-error">
          {syncError}
        </p>
      )}

      {folderResult && (
        <p className="text-xs text-green-600" data-testid="panda-properties-form-files-folder-message">
          Drive folder ready: <span className="font-medium">{folderResult.folderName}</span>{" "}
          <a
            href={`https://drive.google.com/drive/folders/${folderResult.folderId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="panda-properties-form-files-folder-link"
            className="inline-flex items-center gap-0.5 underline"
          >
            Open in Drive<ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}

      {folderError && (
        <p className="text-xs text-destructive" data-testid="panda-properties-form-files-folder-error">
          {folderError}
        </p>
      )}

      {uploading && (
        <DriveUploadProgress
          uploadPercent={uploadPercent}
          uploadingFileName={uploadingFileName}
          testId="panda-properties-form-files-upload-progress"
        />
      )}

      {uploadError && (
        <DriveUploadError
          uploadError={uploadError}
          retryFile={retryFile}
          onRetry={handleRetry}
          testId="panda-properties-form-files-upload-error"
          retryTestId="panda-properties-form-files-btn--retry"
        />
      )}

      {shareWarning && (
        <p className="text-xs text-amber-600" data-testid="panda-properties-form-files-share-warning">
          File saved, but Drive sharing failed — the file may not be accessible via the open/download links. {shareWarning}
        </p>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <>
          {agentItems.length === 0 && clientItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <File className="h-10 w-10 opacity-30" />
              <p className="text-sm">No files yet.</p>
            </div>
          ) : (
            agentItems.length > 0 && (
              <PropertyFilesList items={agentItems} onOpenDeleteDialog={openDeleteDialog} />
            )
          )}

          {clientItems.length > 0 && (
            <div
              data-testid="panda-properties-form-client-uploads-section"
              className="mt-3 flex flex-col gap-2"
            >
              <p className="text-xs font-medium text-muted-foreground">Client uploads</p>
              <ul className="flex flex-col gap-2">
                {clientItems.map((row) => (
                  <li
                    key={`${row.kind}-${row.id}`}
                    data-testid="panda-properties-form-client-uploads-row"
                    className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                  >
                    <PropertyFileIcon mimeType={row.fileType} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {row.fileName ?? "Unnamed file"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.source === "buyer_upload" ? "Buyer upload" : "Seller upload"}
                        {row.fileSize != null ? ` · ${formatPropertyFileBytes(row.fileSize)}` : ""}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => openDeleteDialog(row)}
                      data-testid="panda-properties-form-files-btn--delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <PropertyFileDeleteConfirmDialog
        open={deleteDialog.open}
        fileName={deleteDialog.row?.fileName}
        deleting={deleteDialog.deleting}
        deleteError={deleteDialog.deleteError}
        onRequestClose={closeDeleteDialog}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
