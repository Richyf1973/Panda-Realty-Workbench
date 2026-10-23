import "server-only"

import { extractEmailAddress } from "./gmail-reply"
import {
  collectGmailAttachments,
  extractGmailMessageBody,
  type GmailAttachment,
  type GmailMimePayload,
} from "./gmail-mime"
import { decodeHtmlEntities } from "./html-utils"

interface GmailMessage {
  id: string
  threadId: string
}

export interface GmailThread {
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  attachmentCount: number
}

export interface GmailThreadMessage {
  messageId: string
  from: string
  date: string
  subject: string
  body: string
  attachments: GmailAttachment[]
}

interface GmailThreadReplyMetadata {
  to: string
  referenceMessageId?: string
  references?: string
}

function getHeaderValue(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return ""
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

export async function listGmailMessages(accessToken: string, query: string): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ q: query, maxResults: "100" })
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    throw new Error(`Gmail list messages failed: ${res.status}`)
  }

  const data = (await res.json()) as { messages?: GmailMessage[] }
  return data.messages ?? []
}

export async function getGmailMessageBody(accessToken: string, messageId: string): Promise<string> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    throw new Error(`Gmail get message failed: ${res.status}`)
  }

  const message = (await res.json()) as { payload?: GmailMimePayload }
  return extractGmailMessageBody(message.payload)
}

export async function listGmailThreads(
  accessToken: string,
  query: string,
  maxResults = 20,
): Promise<GmailThread[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads?${params.toString()}`
  const listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })

  if (!listRes.ok) {
    const error = await listRes.text().catch(() => "")
    throw new Error(`Gmail list threads failed: ${listRes.status} ${error}`)
  }

  const listData = (await listRes.json()) as { threads?: { id: string; snippet: string }[] }
  const threadStubs = listData.threads ?? []

  if (threadStubs.length === 0) {
    console.debug(`[listGmailThreads] No threads found for query: ${query}`)
  }

  async function fetchThreadDetail(id: string, snippet: string): Promise<GmailThread> {
    const fullRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!fullRes.ok) {
      console.warn(`[listGmailThreads] Failed to fetch thread ${id}: ${fullRes.status}`)
      return {
        threadId: id,
        subject: "(no subject)",
        from: "",
        date: "",
        snippet: decodeHtmlEntities(snippet),
        attachmentCount: 0,
      }
    }

    const fullData = (await fullRes.json()) as {
      messages?: Array<{ id: string; internalDate?: string; payload?: GmailMimePayload }>
    }

    const messages = fullData.messages ?? []
    const lastMessage = messages[messages.length - 1]
    const headers = lastMessage?.payload?.headers
    const internalDate = lastMessage?.internalDate
    const date = internalDate ? new Date(parseInt(internalDate, 10)).toISOString() : ""

    let attachmentCount = 0
    for (const m of messages) {
      attachmentCount += collectGmailAttachments(m.id, m.payload).length
    }

    return {
      threadId: id,
      subject: getHeaderValue(headers, "Subject") || "(no subject)",
      from: getHeaderValue(headers, "From"),
      date,
      snippet: decodeHtmlEntities(snippet),
      attachmentCount,
    }
  }

  // Fetch thread details in batches of 5 to stay within Gmail API rate limits.
  const BATCH_SIZE = 5
  const threads: GmailThread[] = []
  for (let i = 0; i < threadStubs.length; i += BATCH_SIZE) {
    const batch = threadStubs.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(({ id, snippet }) => fetchThreadDetail(id, snippet)))
    threads.push(...results)
  }

  return threads
}

export async function getGmailThreadMessages(
  accessToken: string,
  threadId: string,
): Promise<{ messages: GmailThreadMessage[] }> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    throw new Error(`Gmail get thread failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    messages?: Array<{ id: string; internalDate?: string; payload?: GmailMimePayload }>
  }

  const messages = (data.messages ?? []).map((m): GmailThreadMessage => {
    const headers = m.payload?.headers
    const internalDate = m.internalDate
    const date = internalDate ? new Date(parseInt(internalDate, 10)).toISOString() : ""
    return {
      messageId: m.id,
      from: getHeaderValue(headers, "From"),
      date,
      subject: getHeaderValue(headers, "Subject"),
      body: extractGmailMessageBody(m.payload),
      attachments: collectGmailAttachments(m.id, m.payload),
    }
  })

  return { messages }
}

export async function getGmailThreadReplyMetadata(
  accessToken: string,
  threadId: string,
  messageId: string,
): Promise<GmailThreadReplyMetadata> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    throw new Error(`Gmail get thread failed: ${res.status}`)
  }

  const data = (await res.json()) as {
    messages?: Array<{ id: string; payload?: GmailMimePayload }>
  }

  const message = (data.messages ?? []).find((entry) => entry.id === messageId)
  if (!message) {
    throw new Error("Reply target message not found")
  }

  const headers = message.payload?.headers
  const to = extractEmailAddress(getHeaderValue(headers, "From"))
  if (!to) {
    throw new Error("Reply target does not have a valid sender email")
  }

  return {
    to,
    referenceMessageId: getHeaderValue(headers, "Message-ID") || undefined,
    references: getHeaderValue(headers, "References") || undefined,
  }
}

export async function fetchGmailAttachmentBytes(
  accessToken: string,
  messageId: string,
  attachmentId: string,
): Promise<Buffer> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Failed to fetch Gmail attachment: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { data?: string }
  if (!data.data) throw new Error("Gmail attachment response missing data field")
  const base64 = data.data.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64")
}
