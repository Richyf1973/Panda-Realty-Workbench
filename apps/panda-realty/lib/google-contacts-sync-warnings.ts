export const GOOGLE_CONTACTS_WARNINGS_JSON_KEY = "googleContactsWarnings" as const

export function mergeWarnings(into: string[], more: readonly string[]) {
  for (const m of more) {
    if (m && !into.includes(m)) into.push(m)
  }
}

export function attachGoogleContactsWarnings<T extends Record<string, unknown>>(
  body: T,
  warnings: string[],
): T & { [GOOGLE_CONTACTS_WARNINGS_JSON_KEY]?: string[] } {
  if (warnings.length === 0) return body
  return { ...body, [GOOGLE_CONTACTS_WARNINGS_JSON_KEY]: warnings }
}
