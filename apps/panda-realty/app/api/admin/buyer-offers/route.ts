import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { buyerOffers } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { autoSyncBuyerOfferCalendar } from "@/lib/calendar-auto-sync.server"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON", 400)
  }

  if (typeof body !== "object" || body === null) {
    return adminJsonError("Invalid body", 400)
  }

  const b = body as Record<string, unknown>

  const propertyEntityId =
    typeof b.propertyEntityId === "number" ? b.propertyEntityId : null
  const offer = typeof b.offer === "string" ? b.offer.trim() : null
  const dateOffered = typeof b.dateOffered === "string" ? b.dateOffered.trim() : null
  const isAccepted = typeof b.isAccepted === "boolean" ? b.isAccepted : false

  if (!propertyEntityId) return adminJsonError("propertyEntityId is required", 400)
  if (!offer) return adminJsonError("offer is required", 400)

  try {
    const [row] = await db
      .insert(buyerOffers)
      .values({
        propertyEntityId,
        offer,
        isAccepted,
        ...(dateOffered ? { dateOffered } : {}),
      })
      .returning()

    if (row) {
      void autoSyncBuyerOfferCalendar(row.buyerOfferId).catch((e) =>
        console.error("[auto-sync] buyer-offer POST", row.buyerOfferId, e),
      )
    }

    return NextResponse.json(row, { status: 201 })
  } catch (cause) {
    console.error("[POST /api/admin/buyer-offers]", cause)
    return adminJsonError("Failed to create offer", 500)
  }
}
