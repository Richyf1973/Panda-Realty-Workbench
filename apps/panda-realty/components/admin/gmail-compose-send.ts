import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"
import type { RichEmailEditorHandle } from "./rich-email-editor"

export type ForwardContext = {
  messageId: string
  from: string
  date: string
  subject: string
  body: string
  gmailChips: Array<{ attachmentId: string; messageId: string; filename: string; mimeType: string }>
}

export type SendEmailParams = {
  to: string
  subject: string
  cc?: string
  bcc?: string
  replyContext?: { threadId: string; messageId: string }
  forwardContext?: ForwardContext
  editorRef: React.RefObject<RichEmailEditorHandle | null>
  editorHtml: string
  driveFileIds: string[]
  propertyListId?: number | null
}

export type SendEmailResult = { ok: true } | { error: string }

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  413: "Attachment too large — please reduce attachment size and try again.",
  502: "Gmail send failed — please try again.",
  503: "Server unavailable — please try again later.",
}

export async function sendGmailCompose({
  to,
  subject,
  cc,
  bcc,
  replyContext,
  forwardContext,
  editorRef,
  editorHtml,
  driveFileIds,
  propertyListId,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const endpoint = replyContext
      ? "/api/admin/gmail/reply"
      : forwardContext
        ? "/api/admin/gmail/forward"
        : "/api/admin/gmail/send"

    const bodyHtml = normalizeEmailSignatureHtml(
      editorRef.current?.getHtml() ?? editorHtml,
    )

    const formData = new FormData()
    formData.append("to", to)
    formData.append("subject", subject)
    formData.append("bodyHtml", bodyHtml)
    if (cc) formData.append("cc", cc)
    if (bcc) formData.append("bcc", bcc)
    if (replyContext) {
      formData.append("threadId", replyContext.threadId)
      formData.append("messageId", replyContext.messageId)
    }
    if (forwardContext) {
      formData.append("messageId", forwardContext.messageId)
      for (const chip of forwardContext.gmailChips) {
        formData.append("attachmentId", chip.attachmentId)
        formData.append("attachmentFilename", chip.filename)
        formData.append("attachmentMimeType", chip.mimeType)
      }
    }
    for (const id of driveFileIds) {
      formData.append("driveFileIds", id)
    }
    if (propertyListId != null) formData.append("propertyListId", String(propertyListId))

    const res = await fetch(endpoint, { method: "POST", body: formData })
    if (!res.ok) {
      const friendlyMessage = HTTP_STATUS_MESSAGES[res.status]
      if (friendlyMessage) return { error: friendlyMessage }
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error ?? `Send failed (${res.status})` }
    }
    return { ok: true }
  } catch (e) {
    console.error("[sendGmailCompose]", e)
    return { error: "Network error - please try again" }
  }
}
