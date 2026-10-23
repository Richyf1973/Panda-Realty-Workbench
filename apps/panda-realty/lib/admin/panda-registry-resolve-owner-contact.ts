export interface ResolvedOwnerContact {
  resolvedPhone: string | null
  resolvedEmail: string | null
  resolvedName: string | null
  /** Name of the owner designated as primary phone (for named tooltip when disabled). */
  primaryPhoneOwnerName: string | null
  /** Name of the owner designated as primary email (for named tooltip when disabled). */
  primaryEmailOwnerName: string | null
}

function trimmed(row: Record<string, unknown>, key: string): string | null {
  const v = row[key]
  return typeof v === "string" ? v.trim() || null : null
}

function ownerNum(row: Record<string, unknown>, key: string): 1 | 2 | 3 | null {
  const v = row[key]
  if (v === 1 || v === 2 || v === 3) return v
  if (v === "1") return 1
  if (v === "2") return 2
  if (v === "3") return 3
  return null
}

/**
 * Resolves the primary phone/email contact for the property list row actions.
 *
 * When primaryPhoneOwnerNum is set, the designated owner's phone is used directly.
 * If that owner has no phone, resolvedPhone is null (button disabled with named tooltip).
 * When primaryPhoneOwnerNum is null (old data), falls back to first non-null phone.
 * Same logic applies to primaryEmailOwnerNum / resolvedEmail.
 */
export function resolvePropertyOwnerContact(row: Record<string, unknown>): ResolvedOwnerContact {
  const primaryPhone = ownerNum(row, "primaryPhoneOwnerNum")
  const primaryEmail = ownerNum(row, "primaryEmailOwnerNum")

  let resolvedPhone: string | null = null
  let primaryPhoneOwnerName: string | null = null
  if (primaryPhone !== null) {
    resolvedPhone = trimmed(row, `owner${primaryPhone}phone`)
    primaryPhoneOwnerName = trimmed(row, `owner${primaryPhone}name`)
  } else {
    for (const n of [1, 2, 3] as const) {
      resolvedPhone = trimmed(row, `owner${n}phone`)
      if (resolvedPhone !== null) break
    }
  }

  let resolvedEmail: string | null = null
  let resolvedName: string | null = null
  let primaryEmailOwnerName: string | null = null
  if (primaryEmail !== null) {
    resolvedEmail = trimmed(row, `owner${primaryEmail}email`)
    resolvedName = trimmed(row, `owner${primaryEmail}name`)
    primaryEmailOwnerName = resolvedName
  } else {
    for (const n of [1, 2, 3] as const) {
      const email = trimmed(row, `owner${n}email`)
      if (email !== null) {
        resolvedEmail = email
        resolvedName = trimmed(row, `owner${n}name`)
        break
      }
    }
    if (resolvedName === null) {
      for (const n of [1, 2, 3] as const) {
        resolvedName = trimmed(row, `owner${n}name`)
        if (resolvedName !== null) break
      }
    }
  }

  return { resolvedPhone, resolvedEmail, resolvedName, primaryPhoneOwnerName, primaryEmailOwnerName }
}
