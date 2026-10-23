import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import type { DateRangeOption } from "@/lib/google-contacts-patch-all-recent"
import { getGoogleContactsPatchAllRecentFilter } from "@/lib/google-contacts-patch-all-recent"
import { getGoogleContactsPatchAllPropertyListAllowlist } from "@/lib/google-contacts-patch-all-recent"
import {
  fetchEntitiesWithPropertyStreetsForBulkSync,
  fetchOwnerSlotsForBulkGoogleContactsSync,
  fetchEntityMembersForBulkSync,
} from "@/lib/google-contacts-bulk-addresses.server"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const url = new URL(request.url)
  const dateRange = url.searchParams.get("dateRange") as DateRangeOption | null

  const recentFilter = getGoogleContactsPatchAllRecentFilter(dateRange)
  const propertyListAllowlist = getGoogleContactsPatchAllPropertyListAllowlist()

  const fetchOpts =
    recentFilter != null || (propertyListAllowlist?.length ?? 0) > 0
      ? {
          ...(recentFilter != null ? { recentActivitySince: recentFilter.cutoff } : {}),
          ...(propertyListAllowlist?.length ? { propertyListIds: propertyListAllowlist } : {}),
        }
      : undefined

  const [entityRows, ownerRows, repRows] = await Promise.all([
    fetchEntitiesWithPropertyStreetsForBulkSync(fetchOpts),
    fetchOwnerSlotsForBulkGoogleContactsSync(fetchOpts),
    fetchEntityMembersForBulkSync(fetchOpts),
  ])

  // Count unique contacts across all three data sources
  const emailSet = new Set<string>()
  const phoneSet = new Set<string>()

  // Entities
  for (const row of entityRows) {
    if (typeof row.emailAddress === "string" && row.emailAddress.trim()) {
      emailSet.add(row.emailAddress.trim().toLowerCase())
    }
    if (typeof row.contact === "string" && row.contact.trim()) {
      phoneSet.add(row.contact.trim())
    }
  }

  // Owners
  for (const row of ownerRows) {
    for (let i = 1; i <= 3; i++) {
      const emailKey = `email${i}` as keyof typeof row
      const phoneKey = `phone${i}` as keyof typeof row
      const email = row[emailKey]
      const phone = row[phoneKey]

      if (typeof email === "string" && email.trim()) {
        emailSet.add(email.trim().toLowerCase())
      }
      if (typeof phone === "string" && phone.trim()) {
        phoneSet.add(phone.trim())
      }
    }
  }

  // Entity members
  for (const row of repRows) {
    if (typeof row.memberEmailAddress === "string" && row.memberEmailAddress.trim()) {
      emailSet.add(row.memberEmailAddress.trim().toLowerCase())
    }
    if (typeof row.memberPhoneNumber === "string" && row.memberPhoneNumber.trim()) {
      phoneSet.add(row.memberPhoneNumber.trim())
    }
  }

  const count = emailSet.size + phoneSet.size

  return NextResponse.json({ count })
}
