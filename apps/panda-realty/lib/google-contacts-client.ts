import "server-only"

import {
  buildGoogleContactsDisplayName,
  type GoogleContactsPropertyRole,
} from "@/lib/google-contact-name-prefix"

export type { GoogleContactsPropertyRole }
import { isDialablePhone, normalizePhoneDigits } from "@/lib/google-contact-dialable"
import { fetchWith429Retry } from "@/lib/google-contacts-fetch-retry"

interface GooglePerson {
  resourceName: string
  etag: string
  names?: Array<{ givenName?: string; familyName?: string }>
  emailAddresses?: Array<{ value: string }>
  phoneNumbers?: Array<{ value: string }>
}

interface SearchContactsResponse {
  results?: Array<{ person: GooglePerson }>
}

export interface UpsertContactData {
  entityName: string
  emailAddress?: string
  phoneNumber?: string
  propertyAddress?: string
  /** Controls `Seller:` / `Contact:` / `Tenant:` / `Enq:` vs omit (unknown category). */
  propertyRole: GoogleContactsPropertyRole
}

function buildDisplayName(data: UpsertContactData): string {
  return buildGoogleContactsDisplayName({
    entityName: data.entityName,
    propertyAddress: data.propertyAddress,
    phoneNumber: data.phoneNumber,
    propertyRole: data.propertyRole,
  })
}

async function searchContactByEmail(accessToken: string, emailAddress: string): Promise<GooglePerson | null> {
  const params = new URLSearchParams({
    query: emailAddress,
    readMask: "emailAddresses,names,phoneNumbers",
  })
  const res = await fetchWith429Retry(
    `https://people.googleapis.com/v1/people:searchContacts?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (!res.ok) {
    throw new Error(`Google Contacts search failed: ${res.status}`)
  }
  const data = (await res.json()) as SearchContactsResponse
  const match = (data.results ?? []).find((r) =>
    r.person.emailAddresses?.some((e) => e.value.toLowerCase() === emailAddress),
  )
  return match?.person ?? null
}

async function searchContactByPhone(accessToken: string, phoneNumber: string): Promise<GooglePerson | null> {
  const digits = normalizePhoneDigits(phoneNumber)
  if (digits.length < 7) return null
  const params = new URLSearchParams({
    query: digits,
    readMask: "emailAddresses,names,phoneNumbers",
  })
  const res = await fetchWith429Retry(
    `https://people.googleapis.com/v1/people:searchContacts?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (!res.ok) {
    throw new Error(`Google Contacts search failed: ${res.status}`)
  }
  const data = (await res.json()) as SearchContactsResponse
  const match = (data.results ?? []).find((r) =>
    r.person.phoneNumbers?.some((p) => normalizePhoneDigits(p.value) === digits),
  )
  return match?.person ?? null
}

export type GoogleContactUpsertOutcome = "created" | "updated"

/**
 * Optional timing collector mutated by `upsertGoogleContact`. Pass an empty
 * object and read fields after `await` to attribute time across the
 * search-email / search-phone / create-or-update HTTP phases.
 */
export interface GoogleContactUpsertTimings {
  searchEmailMs?: number
  searchPhoneMs?: number
  writeMs?: number
  writeKind?: "create" | "update"
}

async function createContact(accessToken: string, data: UpsertContactData): Promise<void> {
  const displayName = buildDisplayName(data)
  const body: Record<string, unknown> = {
    names: [{ givenName: displayName, familyName: "" }],
  }
  if (data.emailAddress) {
    body.emailAddresses = [{ value: data.emailAddress }]
  }
  if (data.phoneNumber) {
    body.phoneNumbers = [{ value: data.phoneNumber }]
  }
  const res = await fetchWith429Retry("https://people.googleapis.com/v1/people:createContact", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Google Contacts create failed: ${res.status}`)
  }
}

function updatePersonFieldsParam(data: UpsertContactData): string {
  const fields = ["names", "phoneNumbers"]
  if (data.emailAddress) fields.push("emailAddresses")
  return fields.join(",")
}

async function updateContact(accessToken: string, person: GooglePerson, data: UpsertContactData): Promise<void> {
  const displayName = buildDisplayName(data)
  const body: Record<string, unknown> = {
    etag: person.etag,
    names: [{ givenName: displayName, familyName: "" }],
    phoneNumbers: data.phoneNumber ? [{ value: data.phoneNumber }] : [],
  }
  if (data.emailAddress) {
    body.emailAddresses = [{ value: data.emailAddress }]
  }
  const params = new URLSearchParams({ updatePersonFields: updatePersonFieldsParam(data) })
  const res = await fetchWith429Retry(
    `https://people.googleapis.com/v1/${person.resourceName}:updateContact?${params.toString()}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    throw new Error(`Google Contacts update failed: ${res.status}`)
  }
}

export async function upsertGoogleContact(
  accessToken: string,
  data: UpsertContactData,
  timings?: GoogleContactUpsertTimings,
): Promise<GoogleContactUpsertOutcome> {
  const normalizedEmail = data.emailAddress?.trim().toLowerCase() || undefined
  const normalizedData: UpsertContactData = { ...data, emailAddress: normalizedEmail }
  const hasEmail = Boolean(normalizedEmail)
  const hasPhone = Boolean(data.phoneNumber?.trim() && isDialablePhone(data.phoneNumber))
  if (!hasEmail && !hasPhone) {
    throw new Error("Google Contacts upsert requires a non-empty email or dialable phone")
  }

  let existing: GooglePerson | null = null
  if (hasEmail && normalizedEmail) {
    const t0 = performance.now()
    existing = await searchContactByEmail(accessToken, normalizedEmail)
    if (timings) timings.searchEmailMs = performance.now() - t0
  }
  if (!existing && hasPhone && data.phoneNumber) {
    const t0 = performance.now()
    existing = await searchContactByPhone(accessToken, data.phoneNumber)
    if (timings) timings.searchPhoneMs = performance.now() - t0
  }

  if (existing) {
    const t0 = performance.now()
    await updateContact(accessToken, existing, normalizedData)
    if (timings) {
      timings.writeMs = performance.now() - t0
      timings.writeKind = "update"
    }
    return "updated"
  }
  const t0 = performance.now()
  await createContact(accessToken, normalizedData)
  if (timings) {
    timings.writeMs = performance.now() - t0
    timings.writeKind = "create"
  }
  return "created"
}
