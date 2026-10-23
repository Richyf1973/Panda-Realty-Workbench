"use client"

/** Dispatched on `window` when a PATCH response includes {@link GOOGLE_CONTACTS_WARNINGS_JSON_KEY}. */
export const PANDA_GOOGLE_CONTACTS_WARNING_EVENT = "panda-realty-google-contacts-warnings" as const

/** Must match {@link GOOGLE_CONTACTS_WARNINGS_JSON_KEY} in `google-contacts-sync-warnings.ts`. */
export const GOOGLE_CONTACTS_WARNINGS_JSON_KEY_CLIENT = "googleContactsWarnings" as const

export function emitGoogleContactsPatchWarnings(
  patchResponse: Record<string, unknown> | null | undefined,
): void {
  if (patchResponse == null || typeof window === "undefined") return
  const raw = patchResponse[GOOGLE_CONTACTS_WARNINGS_JSON_KEY_CLIENT]
  if (!Array.isArray(raw) || raw.length === 0) return
  const messages = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
  if (messages.length === 0) return
  window.dispatchEvent(
    new CustomEvent(PANDA_GOOGLE_CONTACTS_WARNING_EVENT, { detail: messages }),
  )
}
