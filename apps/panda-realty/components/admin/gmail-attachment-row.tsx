"use client"

import { useState } from "react"
import { FileText, Image as ImageIcon, Loader2, Paperclip } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import type { GmailAttachment } from "@/lib/gmail-client"
import { buildAttachmentUrl, formatBytes, isPreviewable } from "./gmail-thread-utilities"

type SaveStatus = "idle" | "saving" | "saved" | "exists" | "error"

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-muted-foreground" />
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-muted-foreground" />
  return <Paperclip className="h-4 w-4 text-muted-foreground" />
}

export function AttachmentRow({
  att,
  propertyListId,
  propertyEntityId,
  entityName,
  ownerNum,
}: {
  att: GmailAttachment
  propertyListId?: number | null
  propertyEntityId?: number | null
  entityName?: string | null
  ownerNum?: 1 | 2 | 3
}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [driveLink, setDriveLink] = useState<string | null>(null)

  const previewable = isPreviewable(att.mimeType)
  const url = buildAttachmentUrl(att.messageId, att.attachmentId, att.filename, att.mimeType, "inline")
  const downloadUrl = buildAttachmentUrl(att.messageId, att.attachmentId, att.filename, att.mimeType, "attachment")
  const hasPropertyContext = propertyListId != null && propertyListId > 0

  async function handleSaveToDrive() {
    if (!hasPropertyContext || saveStatus === "saving") return
    setSaveStatus("saving")
    try {
      const res = await fetch("/api/admin/gmail/threads/attachment/save-to-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: att.messageId,
          attachmentId: att.attachmentId,
          filename: att.filename,
          mimeType: att.mimeType,
          propertyListId,
          propertyEntityId: propertyEntityId ?? null,
          entityName: entityName ?? null,
          ownerNum: ownerNum ?? null,
        }),
      })
      const data = (await res.json()) as {
        saved?: boolean
        alreadyExists?: boolean
        webViewLink?: string | null
        error?: string
      }
      if (!res.ok) {
        setSaveStatus("error")
        return
      }
      if (data.alreadyExists) {
        setDriveLink(data.webViewLink ?? null)
        setSaveStatus("exists")
      } else {
        setDriveLink(data.webViewLink ?? null)
        setSaveStatus("saved")
      }
    } catch {
      setSaveStatus("error")
    }
  }

  return (
    <div
      className="flex items-center gap-2 rounded-sm border bg-background px-2 py-1.5"
      data-testid={`gmail-thread-attachment--${att.attachmentId}`}
    >
      <AttachmentIcon mimeType={att.mimeType} />
      <span className="min-w-0 flex-1 truncate text-xs">{att.filename}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(att.size)}</span>
      {previewable && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
          data-testid={`gmail-thread-attachment-preview--${att.attachmentId}`}
        >
          Preview
        </a>
      )}
      <a
        href={downloadUrl}
        download={att.filename}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
        data-testid={`gmail-thread-attachment-download--${att.attachmentId}`}
      >
        Download
      </a>

      {saveStatus === "saved" && (
        driveLink ? (
          <a
            href={driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
            data-testid={`gmail-attachment-open-in-drive--${att.attachmentId}`}
          >
            Open in Drive ↗
          </a>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">Saved to Drive</span>
        )
      )}

      {saveStatus === "exists" && (
        <span
          className="shrink-0 text-xs text-muted-foreground"
          data-testid={`gmail-attachment-already-in-drive--${att.attachmentId}`}
        >
          Already in Drive
        </span>
      )}

      {saveStatus === "error" && (
        <span className="shrink-0 text-xs text-destructive">Save failed</span>
      )}

      {(saveStatus === "idle" || saveStatus === "saving" || saveStatus === "error") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={!hasPropertyContext || saveStatus === "saving"}
                onClick={handleSaveToDrive}
                data-testid={`gmail-attachment-save-to-drive--${att.attachmentId}`}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save to Drive"
                )}
              </Button>
            </span>
          </TooltipTrigger>
          {!hasPropertyContext && (
            <TooltipContent>No property linked</TooltipContent>
          )}
        </Tooltip>
      )}
    </div>
  )
}
