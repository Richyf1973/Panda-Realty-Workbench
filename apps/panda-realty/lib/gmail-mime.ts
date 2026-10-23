export interface GmailMimePayload {
  mimeType: string
  filename?: string
  body?: { data?: string; attachmentId?: string; size?: number }
  parts?: Array<GmailMimePayload>
  headers?: Array<{ name: string; value: string }>
}

export interface GmailAttachment {
  messageId: string
  attachmentId: string
  filename: string
  mimeType: string
  size: number
}

function htmlToText(html: string): string {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r?\n\s*\r?\n/g, "\n")
    .trim()
}

type BodyCandidate = {
  mime: "text/plain" | "text/html"
  data: string
  depth: number
  viaRfc822: boolean
}

function collectBodyCandidates(
  payload: GmailMimePayload | undefined,
  depth: number,
  viaRfc822: boolean,
  acc: BodyCandidate[],
): void {
  if (!payload) return
  if ((payload.mimeType === "text/plain" || payload.mimeType === "text/html") && payload.body?.data) {
    acc.push({ mime: payload.mimeType, data: payload.body.data, depth, viaRfc822 })
  }
  const childRfc822 = viaRfc822 || payload.mimeType === "message/rfc822"
  if (payload.parts) {
    for (const child of payload.parts) collectBodyCandidates(child, depth + 1, childRfc822, acc)
  }
}

/**
 * Extract a message body from a Gmail MIME payload, preferring top-level
 * `text/plain` over `text/html`, and skipping parts inside `message/rfc822`
 * (quoted/forwarded messages) unless nothing else is available.
 */
export function extractGmailMessageBody(payload: GmailMimePayload | undefined): string {
  if (!payload) return ""
  const candidates: BodyCandidate[] = []
  collectBodyCandidates(payload, 0, false, candidates)
  if (candidates.length === 0) return ""

  const nonQuoted = candidates.filter((c) => !c.viaRfc822)
  const pool = nonQuoted.length > 0 ? nonQuoted : candidates

  const plain = pool.filter((c) => c.mime === "text/plain").sort((a, b) => a.depth - b.depth)[0]
  if (plain) return Buffer.from(plain.data, "base64url").toString("utf-8")

  const html = pool.filter((c) => c.mime === "text/html").sort((a, b) => a.depth - b.depth)[0]
  if (html) return htmlToText(Buffer.from(html.data, "base64url").toString("utf-8"))

  return ""
}

/**
 * Walk a Gmail MIME payload and return parts that have an `attachmentId` and a
 * non-empty filename. Inline parts whose filename is empty (signatures/logos)
 * are skipped.
 */
export function collectGmailAttachments(
  messageId: string,
  payload: GmailMimePayload | undefined,
): GmailAttachment[] {
  if (!payload) return []
  const out: GmailAttachment[] = []

  function walk(p: GmailMimePayload) {
    const attachmentId = p.body?.attachmentId
    const filename = p.filename ?? ""
    if (attachmentId && filename.length > 0) {
      out.push({
        messageId,
        attachmentId,
        filename,
        mimeType: p.mimeType,
        size: p.body?.size ?? 0,
      })
    }
    if (p.parts) for (const child of p.parts) walk(child)
  }
  walk(payload)
  return out
}
