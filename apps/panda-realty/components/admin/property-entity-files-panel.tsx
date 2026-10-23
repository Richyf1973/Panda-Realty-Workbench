"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { ExternalLink, File, Loader2, Trash2, Upload } from "lucide-react"

import { Button } from "@repo/ui/button"

import {
  formatPropertyFileBytes,
  PropertyFileIcon,
} from "@/components/admin/property-file-shared"
import { PropertyFileDeleteConfirmDialog } from "@/components/admin/property-file-delete-confirm-dialog"
import { DriveUploadProgress, DriveUploadError } from "@/components/admin/drive-upload-feedback"
import { useDriveUpload } from "@/lib/use-drive-upload"

interface PropertyEntityFile {
  propertyEntityFileId: number
  propertyEntityId: number
  fileType: string | null
  fileLink: string | null
  fileName: string | null
  fileSize: number | null
  googleDriveFileId: string | null
  createdAt: string | null
}

interface DeleteDialogState {
  open: boolean
  file: PropertyEntityFile | null
  deleting: boolean
}

interface PropertyEntityFilesPanelProps {
  propertyEntityId: number | null
  variant: "create" | "edit"
}

export function PropertyEntityFilesPanel({
  propertyEntityId,
  variant,
}: PropertyEntityFilesPanelProps) {
  const [files, setFiles] = useState<PropertyEntityFile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    file: null,
    deleting: false,
  })

  const fileInputId = useId()

  const loadFiles = useCallback(async (signal?: AbortSignal) => {
    if (propertyEntityId == null) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/admin/property-entity-files?propertyEntityId=${propertyEntityId}`,
        { signal },
      )
      if (!res.ok) throw new Error(`Failed to load files (${res.status})`)
      const data = (await res.json()) as PropertyEntityFile[]
      setFiles(data)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setLoadError(
        err instanceof Error ? err.message : "Failed to load files.",
      )
    } finally {
      setLoading(false)
    }
  }, [propertyEntityId])

  // Hooks must run unconditionally; ?? 0 is unreachable when propertyEntityId is null
  // because the component returns early below after the hooks block.
  const entityIdForUpload = propertyEntityId ?? -1
  const { uploading, uploadPercent, uploadingFileName, uploadError, retryFile, handleFileInput, handleRetry } =
    useDriveUpload({
      initiateUrl: "/api/admin/property-entity-files/initiate-upload",
      initiateExtraFields: { propertyEntityId: entityIdForUpload },
      recordUrl: "/api/admin/property-entity-files/record-upload",
      recordExtraFields: { propertyEntityId: entityIdForUpload },
      onRecordSuccess: async (data) => {
        setFiles((prev) => [...prev, data as unknown as PropertyEntityFile])
      },
    })

  useEffect(() => {
    if (variant === "edit") {
      const controller = new AbortController()
      void loadFiles(controller.signal)
      return () => controller.abort()
    }
    setLoading(false)
  }, [variant, loadFiles])

  function openDeleteDialog(file: PropertyEntityFile) {
    setDeleteDialog({ open: true, file, deleting: false })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, file: null, deleting: false })
  }

  async function confirmDelete() {
    if (!deleteDialog.file) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true }))
    try {
      const res = await fetch(
        `/api/admin/property-entity-files/${deleteDialog.file.propertyEntityFileId}`,
        { method: "DELETE" },
      )
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setFiles((prev) =>
        prev.filter(
          (f) =>
            f.propertyEntityFileId !==
            deleteDialog.file!.propertyEntityFileId,
        ),
      )
      setDeleteDialog({ open: false, file: null, deleting: false })
    } catch (err) {
      console.error("Delete failed", err)
      setDeleteDialog((prev) => ({ ...prev, deleting: false }))
    }
  }

  if (variant === "create" || propertyEntityId == null) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        Save the property entity first, then upload files here.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {files.length === 0 && !loading ? "No files yet" : `${files.length} file${files.length !== 1 ? "s" : ""}`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          asChild={!uploading}
        >
          {!uploading ? (
            <label htmlFor={fileInputId} className="inline-flex cursor-pointer items-center gap-1.5">
              <Upload className="h-4 w-4" />
              Upload files
            </label>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          )}
        </Button>
        <input
          id={fileInputId}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={handleFileInput}
        />
      </div>

      {uploading && (
        <DriveUploadProgress
          uploadPercent={uploadPercent}
          uploadingFileName={uploadingFileName}
        />
      )}

      {uploadError && (
        <DriveUploadError
          uploadError={uploadError}
          retryFile={retryFile}
          onRetry={handleRetry}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <File className="h-10 w-10 opacity-30" />
          <p className="text-sm">No files uploaded yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.propertyEntityFileId}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <PropertyFileIcon mimeType={file.fileType} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {file.fileName ?? "Unnamed file"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {file.fileType ?? "unknown type"}
                  {file.fileSize != null
                    ? ` · ${formatPropertyFileBytes(file.fileSize)}`
                    : ""}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {file.fileLink && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    asChild
                  >
                    <a
                      href={file.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Open</span>
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => openDeleteDialog(file)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PropertyFileDeleteConfirmDialog
        open={deleteDialog.open}
        fileName={deleteDialog.file?.fileName}
        deleting={deleteDialog.deleting}
        onRequestClose={closeDeleteDialog}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
