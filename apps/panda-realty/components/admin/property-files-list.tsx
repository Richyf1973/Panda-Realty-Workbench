"use client"

import { useState } from "react"
import { Download, ExternalLink, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"

import { LabelledShareToggle } from "@/components/admin/labelled-share-toggle"
import { formatPropertyFileBytes, PropertyFileIcon } from "@/components/admin/property-file-shared"
import { patchFileSharedWithPortal } from "@/lib/patch-file-shared-with-portal"
import { patchFileSharedWithSeller } from "@/lib/patch-file-shared-with-seller"
import type { PropertyDialogAggregateFileRow } from "@/lib/property-list-files-aggregate.types"
import type { ShareToggleField } from "@/lib/share-toggle-toast"

function FileShareToggle({
  row,
  field,
  label,
  labelTestId,
  testIdPrefix,
  patchFn,
}: {
  row: PropertyDialogAggregateFileRow
  field: ShareToggleField
  label: string
  labelTestId: string
  testIdPrefix: string
  patchFn: (kind: string, id: number, value: boolean) => Promise<boolean>
}) {
  const [checked, setChecked] = useState(row[field])

  return (
    <LabelledShareToggle
      checked={checked}
      kind={row.kind}
      id={row.id}
      field={field}
      label={label}
      labelTestId={labelTestId}
      switchTestId={`${testIdPrefix}--${row.kind}-${row.id}`}
      patchFn={patchFn}
      onConfirmed={setChecked}
    />
  )
}

export function PropertyFilesList({
  items,
  onOpenDeleteDialog,
}: {
  items: PropertyDialogAggregateFileRow[]
  onOpenDeleteDialog: (row: PropertyDialogAggregateFileRow) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((row) => (
        <li
          key={`${row.kind}-${row.id}`}
          className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
          data-testid="panda-properties-form-files-row"
          data-file-kind={row.kind}
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
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              data-testid="panda-properties-form-files-source"
            >
              Source: {row.sourceLabel}
              {row.source === "google_drive" && (
                <span
                  className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700"
                  data-testid="panda-properties-form-files-drive-badge"
                >
                  Drive
                </span>
              )}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FileShareToggle
              row={row}
              field="sharedWithPortal"
              label="Buyer"
              labelTestId="files-buyer-share-label"
              testIdPrefix="files-buyer-share-switch"
              patchFn={patchFileSharedWithPortal}
            />
            <FileShareToggle
              row={row}
              field="sharedWithSeller"
              label="Seller"
              labelTestId="files-seller-share-label"
              testIdPrefix="files-seller-share-switch"
              patchFn={patchFileSharedWithSeller}
            />
            {row.googleDriveFileId && (
              <Button type="button" size="sm" variant="ghost" asChild>
                <a
                  href={`https://drive.google.com/uc?export=download&id=${row.googleDriveFileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="panda-properties-form-files-btn--download"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </a>
              </Button>
            )}
            {row.fileLink && (
              <Button type="button" size="sm" variant="ghost" asChild>
                <a
                  href={row.fileLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="panda-properties-form-files-btn--open"
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
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onOpenDeleteDialog(row)}
              data-testid="panda-properties-form-files-btn--delete"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
