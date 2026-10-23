"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { ExternalLink, File, Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"

import {
  formatPropertyFileBytes,
  PropertyFileIcon,
} from "@/components/admin/property-file-shared"
import { PropertyFileDeleteConfirmDialog } from "@/components/admin/property-file-delete-confirm-dialog"
import { DriveUploadProgress, DriveUploadError } from "@/components/admin/drive-upload-feedback"
import { useDriveUpload } from "@/lib/use-drive-upload"
import type { PropertyDialogAggregateFileRow } from "@/lib/property-list-files-aggregate.types"

interface PropertyListOwnerFilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyListId: number
  ownerNum: 1 | 2 | 3
  propertyLabel: string
}

export function PropertyListOwnerFilesDialog({
  open,
  onOpenChange,
  propertyListId,
  ownerNum,
  propertyLabel,
}: PropertyListOwnerFilesDialogProps) {
  const fileInputId = useId()

  const [items, setItems] = useState<PropertyDialogAggregateFileRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    row: PropertyDialogAggregateFileRow | null
    deleting: boolean
    error: string | null
  }>({ open: false, row: null, deleting: false, error: null })

  const loadItems = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyListId}/owner-files?ownerNum=${ownerNum}`,
      )
      if (!res.ok) throw new Error(`Failed to load files (${res.status})`)
      const data = (await res.json()) as { items?: PropertyDialogAggregateFileRow[] }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load files.")
    } finally {
      setLoading(false)
    }
  }, [propertyListId, ownerNum])

  useEffect(() => {
    if (open) void loadItems()
  }, [open, loadItems])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setLoadError(null)
      setItems([])
    }
    onOpenChange(nextOpen)
  }

  const { uploading, uploadPercent, uploadingFileName, uploadError, retryFile, handleFileInput, handleRetry } =
    useDriveUpload({
      initiateUrl: "/api/admin/property-list-files/initiate-upload",
      initiateExtraFields: { propertyListId },
      recordUrl: "/api/admin/property-list-files/record-upload",
      recordExtraFields: { propertyListId, ownerNum },
      onRecordSuccess: async () => { await loadItems() },
    })

  function openDeleteDialog(row: PropertyDialogAggregateFileRow) {
    setDeleteDialog({ open: true, row, deleting: false, error: null })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, row: null, deleting: false, error: null })
  }

  async function confirmDelete() {
    const row = deleteDialog.row
    if (!row) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true, error: null }))
    try {
      const fileId = row.propertyListFileId ?? row.id
      const res = await fetch(`/api/admin/property-list-files/${fileId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Delete failed (${res.status})`)
      }
      setItems((prev) => prev.filter((r) => r.id !== row.id))
      setDeleteDialog({ open: false, row: null, deleting: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed."
      setDeleteDialog((prev) => ({ ...prev, deleting: false, error: message }))
    }
  }

  const title = `Owner ${ownerNum} Files${propertyLabel ? ` — ${propertyLabel}` : ""}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-lg"
        data-testid="property-owner-files-dialog"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle data-testid="property-owner-files-dialog-title">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-sm font-medium text-muted-foreground"
              data-testid="property-owner-files-count"
            >
              {items.length > 0
                ? `${items.length} file${items.length !== 1 ? "s" : ""}`
                : null}
            </span>
            {!uploading ? (
              <Button variant="outline" size="sm" asChild data-testid="property-owner-files-btn--add">
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
                data-testid="property-owner-files-btn--add"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </Button>
            )}
          </div>

          <input
            id={fileInputId}
            type="file"
            multiple
            aria-label="Upload owner files"
            className="sr-only"
            tabIndex={-1}
            onChange={handleFileInput}
          />

          {uploading && (
            <DriveUploadProgress
              uploadPercent={uploadPercent}
              uploadingFileName={uploadingFileName}
              testId="property-owner-files-upload-progress"
            />
          )}

          {uploadError && (
            <DriveUploadError
              uploadError={uploadError}
              retryFile={retryFile}
              onRetry={handleRetry}
              testId="property-owner-files-upload-error"
              retryTestId="property-owner-files-btn--retry"
            />
          )}

          {deleteDialog.error && (
            <p className="text-sm text-destructive" data-testid="property-owner-files-delete-error">
              {deleteDialog.error}
            </p>
          )}

          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground"
              data-testid="property-owner-files-empty"
            >
              <File className="h-10 w-10 opacity-30" />
              <p className="text-sm">No files for this owner.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
                  data-testid="property-owner-files-row"
                  data-file-id={String(row.id)}
                >
                  <PropertyFileIcon mimeType={row.fileType} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {row.fileName ?? "Unnamed file"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.fileType ?? "unknown type"}
                      {row.fileSize != null ? ` · ${formatPropertyFileBytes(row.fileSize)}` : ""}
                    </span>
                    <span
                      className="text-xs text-muted-foreground"
                      data-testid="property-owner-files-source"
                    >
                      Source: {row.sourceLabel}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {row.fileLink && (
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <a href={row.fileLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">Open</span>
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => openDeleteDialog(row)}
                      data-testid="property-owner-files-btn--delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" data-testid="property-owner-files-btn--close">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>

        <PropertyFileDeleteConfirmDialog
          open={deleteDialog.open}
          fileName={deleteDialog.row?.fileName}
          deleting={deleteDialog.deleting}
          onRequestClose={closeDeleteDialog}
          onConfirm={confirmDelete}
        />
      </DialogContent>
    </Dialog>
  )
}
