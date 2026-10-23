/**
 * Serialize App Router `searchParams` for the admin entity client so the first
 * client render matches SSR (avoids `useSearchParams()` empty-on-server mismatches).
 */
export function serializeAdminEntityPageSearchParams(
  sp: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!sp) return ""
  const u = new URLSearchParams()
  const keys = Object.keys(sp).sort((a, b) => a.localeCompare(b))
  for (const key of keys) {
    const value = sp[key]
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) u.append(key, v)
    } else {
      u.set(key, value)
    }
  }
  return u.toString()
}
