import type { GmailAttachment } from "@/lib/gmail-client"

export type AttachmentChipItem =
  | { id: string; status: "uploading"; file: File; progress: number }
  | { id: string; status: "ready"; file: File; driveFileId: string }
  | { id: string; status: "error"; file: File; errorMessage: string }
  | { id: string; status: "gmail"; attachmentId: string; messageId: string; filename: string; mimeType: string; size: number }

export type GmailForwardContext = {
  messageId: string
  from: string
  date: string
  subject: string
  body: string
  attachments: GmailAttachment[]
}
