import "server-only"

import { NextResponse } from "next/server"

/**
 * Full text of `Error#message` joined with ` · ` for dev responses (Drizzle often wraps Postgres).
 */
export function formatErrorChainForDevDetail(cause: unknown): string {
  const parts: string[] = []
  const seen = new Set<unknown>()
  let cur: unknown = cause
  let guard = 0
  while (cur != null && guard++ < 12) {
    if (seen.has(cur)) break
    seen.add(cur)
    if (cur instanceof Error && cur.message.trim() !== "") {
      parts.push(cur.message.trim())
    }
    cur = cur instanceof Error && cur.cause !== undefined ? cur.cause : null
  }
  return parts.join(" · ")
}

/**
 * Walks `Error#cause` chains and postgres.js / pg-style `{ code: "23503" }` objects to return a
 * short, user-safe message for common Postgres errors. Returns null if unmapped.
 */
export function postgresAdminErrorClientMessage(cause: unknown): string | null {
  const chainText = formatErrorChainForDevDetail(cause)
  const lower = chainText.toLowerCase()
  if (
    lower.includes("foreign key constraint") ||
    lower.includes("violates foreign key") ||
    /\b23503\b/.test(chainText)
  ) {
    return "This row references data that is missing or no longer exists (for example the buyer entity). Refresh the page and try again."
  }
  if (lower.includes("check constraint") || /\b23514\b/.test(chainText)) {
    return "The data does not satisfy a database rule for one of these fields."
  }
  if (lower.includes("permission denied") || /\b42501\b/.test(chainText)) {
    return "You do not have permission to perform this action."
  }

  const chain = collectErrorChainObjects(cause)
  for (const e of chain) {
    if (e === null || typeof e !== "object") continue
    const code = (e as { code?: unknown }).code
    if (typeof code !== "string" || code.length !== 5) continue
    switch (code) {
      case "23503":
        return "This row references data that is missing or no longer exists (for example the buyer entity). Refresh the page and try again."
      case "23514":
        return "The data does not satisfy a database rule for one of these fields."
      case "42501":
        return "You do not have permission to perform this action."
      case "23505":
        return null
      default:
        break
    }
  }
  return null
}

export function adminJsonErrorWithOptionalDevDetail(
  message: string,
  status: number,
  cause: unknown,
): NextResponse {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: message }, { status })
  }
  const detail = formatErrorChainForDevDetail(cause)
  if (detail === "") {
    return NextResponse.json({ error: message }, { status })
  }
  return NextResponse.json({ error: message, detail }, { status })
}

function collectErrorChainObjects(err: unknown): unknown[] {
  const out: unknown[] = []
  const seen = new Set<unknown>()
  let cur: unknown = err
  let guard = 0
  while (cur != null && guard++ < 20) {
    if (seen.has(cur)) break
    seen.add(cur)
    out.push(cur)
    cur = cur instanceof Error ? cur.cause : null
  }
  return out
}
