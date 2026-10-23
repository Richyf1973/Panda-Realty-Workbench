/**
 * Google People API rate limits — retry **429** using **`Retry-After`** when present, else exponential backoff.
 */

const DEFAULT_MAX_ATTEMPTS = 6
const MIN_BACKOFF_MS = 50
const MAX_RETRY_AFTER_MS = 120_000
const MAX_EXPONENTIAL_MS = 30_000
const EXPONENTIAL_BASE_MS = 500

/** Milliseconds to wait after a 429 before the next attempt (exponential leg, zero-based exponent). */
export function compute429BackoffMs(headers: Headers, exponentZeroBased: number): number {
  const ra = headers.get("retry-after")?.trim()
  if (ra) {
    const asSeconds = Number(ra)
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(Math.max(asSeconds * 1000, MIN_BACKOFF_MS), MAX_RETRY_AFTER_MS)
    }
    const asHttpDate = Date.parse(ra)
    if (!Number.isNaN(asHttpDate)) {
      return Math.min(Math.max(asHttpDate - Date.now(), MIN_BACKOFF_MS), MAX_RETRY_AFTER_MS)
    }
  }
  const exp = Math.min(Math.max(exponentZeroBased, 0), 12)
  const jitter = Math.floor(Math.random() * 250)
  return Math.min(EXPONENTIAL_BASE_MS * 2 ** exp + jitter, MAX_EXPONENTIAL_MS)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * `fetch` wrapper: on **429**, wait per {@link compute429BackoffMs} and retry until `maxAttempts`
 * or a non-429 response (which is returned, including final 429).
 */
export async function fetchWith429Retry(
  url: string,
  init: RequestInit,
  options?: { maxAttempts?: number },
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  let last: Response | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, init)
    last = res
    if (res.status !== 429) return res
    if (attempt >= maxAttempts) return res
    await sleep(compute429BackoffMs(res.headers, attempt - 1))
  }
  return last!
}
