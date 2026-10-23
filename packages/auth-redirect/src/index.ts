/**
 * Normalizes post-login `next` query: same-origin path only; blocks open redirects
 * (e.g. `//evil.com`) and non-path values.
 */
export function safeNextPath(next: string | null): string {
  if (!next) return "/"
  if (!next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}

/**
 * First string value for a key from Next.js App Router `searchParams`
 * (`string | string[] | undefined`).
 */
export function firstStringSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const raw = sp[key]
  if (typeof raw === "string") return raw
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0]
  return null
}

/** `next` query from page `searchParams`, validated for safe in-app navigation. */
export function safeNextPathFromPageSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string {
  return safeNextPath(firstStringSearchParam(sp, "next"))
}
