import type { GmailAttachment } from "@/lib/gmail-client"
import { formatThreadDate } from "./gmail-thread-utilities"
import type { AttachmentChipItem, GmailForwardContext } from "./gmail-compose-dialog-types"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildForwardBlockquoteHtml(ctx: GmailForwardContext): string {
  const formattedDate = formatThreadDate(ctx.date) || ctx.date
  return [
    "<p><br></p>",
    '<blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:12px 0;color:#555;">',
    '<p style="margin:0 0 8px;font-style:italic;color:#888;">——— Forwarded message ———</p>',
    '<p style="margin:0 0 4px;">',
    `<strong>From:</strong> ${escapeHtml(ctx.from)}<br>`,
    `<strong>Date:</strong> ${escapeHtml(formattedDate)}<br>`,
    `<strong>Subject:</strong> ${escapeHtml(ctx.subject)}`,
    "</p>",
    `<div style="margin-top:8px;white-space:pre-wrap;">${escapeHtml(ctx.body)}</div>`,
    "</blockquote>",
  ].join("")
}

export function gmailChipsFromAttachments(attachments: GmailAttachment[]): AttachmentChipItem[] {
  return attachments.map((att) => ({
    id: `gmail-${att.attachmentId}`,
    status: "gmail" as const,
    attachmentId: att.attachmentId,
    messageId: att.messageId,
    filename: att.filename,
    mimeType: att.mimeType,
    size: att.size,
  }))
}
