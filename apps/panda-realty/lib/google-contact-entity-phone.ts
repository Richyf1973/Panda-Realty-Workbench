import { isDialablePhone } from "@/lib/google-contact-dialable"

function firstDialable(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined
  const t = value.trim()
  return t && isDialablePhone(t) ? t : undefined
}

/**
 * Resolves the phone number for a Google Contact upsert using the priority:
 * dialable `contact` → first dialable member phone.
 */
export function resolveEntityPhoneForGoogleSync(
  contact: string | null | undefined,
  memberPhones: ReadonlyArray<string | null | undefined> = [],
): string | undefined {
  const fromContact = firstDialable(contact)
  if (fromContact) return fromContact

  for (const p of memberPhones) {
    const fromMember = firstDialable(p)
    if (fromMember) return fromMember
  }

  return undefined
}
