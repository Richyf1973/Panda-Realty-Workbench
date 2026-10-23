import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { getDriveAccessToken } from "@/lib/google-drive-client"

export type PropertyDriveRow = {
  id: number
  streetAddress: string
  suburb: string
  state: string
  postcode: string
}

type PropertyDriveAccessResult =
  | { ok: true; prop: PropertyDriveRow; accessToken: string }
  | { ok: false; error: string; status: number }

export async function getPropertyWithDriveAccess(
  propertyListId: number,
): Promise<PropertyDriveAccessResult> {
  const [prop] = await db
    .select({
      id: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!prop) return { ok: false, error: "Property not found", status: 404 }

  let accessToken: string
  try {
    accessToken = await getDriveAccessToken()
  } catch {
    return {
      ok: false,
      error: "Google Drive is not connected. Please reconnect your Google account to enable file uploads.",
      status: 503,
    }
  }

  return { ok: true, prop, accessToken }
}
