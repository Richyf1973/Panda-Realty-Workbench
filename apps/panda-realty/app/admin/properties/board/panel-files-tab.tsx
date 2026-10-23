"use client"

import { useState } from "react"
import { FileText } from "lucide-react"

import { LabelledShareToggle } from "@/components/admin/labelled-share-toggle"
import { patchFileSharedWithPortal } from "@/lib/patch-file-shared-with-portal"
import { patchFileSharedWithSeller } from "@/lib/patch-file-shared-with-seller"
import type { ShareToggleField } from "@/lib/share-toggle-toast"

import { EmptyState } from "./panel-shared"
import type { PropertyDetailFile } from "./property-types"

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function PanelFileToggle({
  file,
  onToggle,
  field,
  label,
  labelTestId,
  testIdPrefix,
  patchFn,
}: {
  file: PropertyDetailFile
  onToggle: (fileId: number, kind: string, field: ShareToggleField, value: boolean) => void
  field: ShareToggleField
  label: string
  labelTestId: string
  testIdPrefix: string
  patchFn: (kind: string, fileId: number, value: boolean) => Promise<boolean>
}) {
  return (
    <LabelledShareToggle
      checked={file[field]}
      kind={file.kind}
      id={file.fileId}
      field={field}
      label={label}
      labelTestId={labelTestId}
      switchTestId={`${testIdPrefix}--${file.kind}-${file.fileId}`}
      patchFn={patchFn}
      onConfirmed={(value) => onToggle(file.fileId, file.kind, field, value)}
    />
  )
}

export function FilesTab({ files: initialFiles }: { files: PropertyDetailFile[] }) {
  const [files, setFiles] = useState(initialFiles)

  if (files.length === 0) return <EmptyState message="No files attached yet." />

  function handleToggle(fileId: number, kind: string, field: "sharedWithPortal" | "sharedWithSeller", value: boolean) {
    setFiles((prev) =>
      prev.map((f) => (f.fileId === fileId && f.kind === kind ? { ...f, [field]: value } : f)),
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={`${file.kind}-${file.fileId}`}
          data-testid={`pipeline-property-file-row--${file.kind}-${file.fileId}`}
          className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            {file.fileLink ? (
              <a
                href={file.fileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
              >
                {file.fileName ?? "Untitled file"}
              </a>
            ) : (
              <p className="truncate text-sm font-medium text-foreground">
                {file.fileName ?? "Untitled file"}
              </p>
            )}
            <div className="flex gap-2 text-xs text-muted-foreground">
              {file.fileType && <span>{file.fileType}</span>}
              {file.fileSize != null && <span>{formatFileSize(file.fileSize)}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <PanelFileToggle
              file={file}
              onToggle={handleToggle}
              field="sharedWithPortal"
              label="Buyer"
              labelTestId="pipeline-property-file-buyer-label"
              testIdPrefix="pipeline-property-file-buyer-switch"
              patchFn={patchFileSharedWithPortal}
            />
            <PanelFileToggle
              file={file}
              onToggle={handleToggle}
              field="sharedWithSeller"
              label="Seller"
              labelTestId="pipeline-property-file-seller-label"
              testIdPrefix="pipeline-property-file-seller-switch"
              patchFn={patchFileSharedWithSeller}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
