import "server-only"

export interface GmailAttachmentInput {
  name: string
  mimeType: string
  data: Buffer
}

interface SendGmailReplyParams {
  threadId: string
  to: string
  subject: string
  bodyHtml: string
  cc?: string
  bcc?: string
  referenceMessageId?: string
  references?: string
  attachments?: GmailAttachmentInput[]
}

const BOUNDARY = "===gmail_boundary_x7f3a9b2==="

function buildMultipartMixedRaw(
  headerLines: string[],
  bodyHtml: string,
  attachments: GmailAttachmentInput[],
): string {
  const bodyB64 = Buffer.from(bodyHtml, "utf8")
    .toString("base64")
    .replace(/.{76}/g, "$&\r\n")

  if (attachments.length === 0) {
    const raw = [
      ...headerLines,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      bodyB64,
    ].join("\r\n")
    return toBase64Url(raw)
  }

  const parts: string[] = [
    `--${BOUNDARY}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    bodyB64,
  ]

  for (const attachment of attachments) {
    const b64 = attachment.data.toString("base64").replace(/.{76}/g, "$&\r\n")
    parts.push(
      `--${BOUNDARY}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.name}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.name}"`,
      "",
      b64,
    )
  }

  parts.push(`--${BOUNDARY}--`)

  const raw = [
    ...headerLines,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
    "",
    ...parts,
  ].join("\r\n")

  return toBase64Url(raw)
}

export function encodeHeaderValue(value: string): string {
  if (!value || /^[\x00-\x7F]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  bodyHtml: string,
  attachments: GmailAttachmentInput[] = [],
  cc?: string,
  bcc?: string,
): Promise<{ threadId: string }> {
  const sanitizedTo = to.replace(/[\r\n]+/g, " ").trim()
  const sanitizedSubject = subject.replace(/[\r\n]+/g, " ").trim()
  const headerLines = [`To: ${sanitizedTo}`, `Subject: ${encodeHeaderValue(sanitizedSubject)}`]
  const sanitizedCc = cc?.replace(/[\r\n]+/g, " ").trim()
  const sanitizedBcc = bcc?.replace(/[\r\n]+/g, " ").trim()
  if (sanitizedCc) headerLines.push(`Cc: ${sanitizedCc}`)
  if (sanitizedBcc) headerLines.push(`Bcc: ${sanitizedBcc}`)

  const encoded = buildMultipartMixedRaw(headerLines, bodyHtml, attachments)

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Gmail send failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { id: string; threadId: string }
  return { threadId: data.threadId }
}

export async function sendGmailReply(
  accessToken: string,
  { threadId, to, subject, bodyHtml, cc, bcc, referenceMessageId, references, attachments = [] }: SendGmailReplyParams,
): Promise<{ threadId: string }> {
  const sanitizedTo = to.replace(/[\r\n]+/g, " ").trim()
  const sanitizedSubject = subject.replace(/[\r\n]+/g, " ").trim()
  const headerLines: string[] = [`To: ${sanitizedTo}`, `Subject: ${encodeHeaderValue(sanitizedSubject)}`]
  const sanitizedCc = cc?.replace(/[\r\n]+/g, " ").trim()
  const sanitizedBcc = bcc?.replace(/[\r\n]+/g, " ").trim()
  if (sanitizedCc) headerLines.push(`Cc: ${sanitizedCc}`)
  if (sanitizedBcc) headerLines.push(`Bcc: ${sanitizedBcc}`)

  if (referenceMessageId?.trim()) {
    headerLines.push(`In-Reply-To: ${referenceMessageId.trim()}`)
  }
  if (references?.trim()) {
    headerLines.push(`References: ${references.trim()}`)
  } else if (referenceMessageId?.trim()) {
    headerLines.push(`References: ${referenceMessageId.trim()}`)
  }

  const encoded = buildMultipartMixedRaw(headerLines, bodyHtml, attachments)

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded, threadId }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Gmail reply failed: ${res.status} ${text}`)
  }

  return { threadId }
}

export async function getConnectedGmailEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Failed to get Gmail profile: ${res.status}`)
  }
  const data = (await res.json()) as { emailAddress: string }
  return data.emailAddress
}
