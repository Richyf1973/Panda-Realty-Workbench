import type { Page, Route } from "@playwright/test"

/**
 * Parse text fields from a multipart/form-data Playwright request into a plain record.
 * Binary file parts (those with a filename) are skipped. All values are strings — callers
 * must coerce types as needed.  Falls back to postDataJSON() if the request is not
 * multipart (e.g. during a future rollback to JSON).
 */
export async function parseFormDataBody(route: Route): Promise<Record<string, string | undefined>> {
  const contentType = route.request().headers()["content-type"] ?? ""
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/)
  if (!boundaryMatch) {
    return ((await route.request().postDataJSON()) ?? {}) as Record<string, string | undefined>
  }
  const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, "")
  const rawBody = route.request().postData() ?? ""
  const result: Record<string, string | undefined> = {}

  for (const part of rawBody.split(`--${boundary}`)) {
    if (!part || part === "--" || part.trim() === "--") continue
    const separatorIdx = part.indexOf("\r\n\r\n")
    if (separatorIdx === -1) continue
    const headers = part.slice(0, separatorIdx)
    if (headers.includes("filename=")) continue // skip file parts
    const nameMatch = headers.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const value = part.slice(separatorIdx + 4).replace(/\r\n$/, "")
    const key = nameMatch[1]
    result[key] = key in result ? `${result[key]},${value}` : value
  }
  return result
}

export const THREAD_1 = {
  threadId: "owner-thread-001",
  subject: "Re: 12 Test Street settlement query",
  from: "Keylaw Brisbane <contracts@keylaw.com.au>",
  date: "2026-04-25T06:00:00.000Z",
  snippet: "Please find attached trust receipt.",
  attachmentCount: 1,
}

export const THREAD_2 = {
  threadId: "owner-thread-002",
  subject: "Open home scheduled",
  from: "admin@mypandarealty.com.au",
  date: "2026-04-22T01:00:00.000Z",
  snippet: "Saturday 10am.",
  attachmentCount: 0,
}

export const THREADS_RESPONSE = { threads: [THREAD_1, THREAD_2] }
export const EMPTY_THREADS_RESPONSE = { threads: [] }

export async function mockGmailThreadsList(
  page: Page,
  body: unknown,
  opts: { onHit?: () => void; status?: number } = {},
) {
  const status = opts.status ?? 200
  await page.route("**/api/admin/gmail/threads**", async (route: Route) => {
    const url = route.request().url()
    if (url.includes("/threads/body") || url.includes("/threads/attachment")) {
      await route.continue()
      return
    }
    opts.onHit?.()
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}
