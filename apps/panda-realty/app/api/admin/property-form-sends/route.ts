import "server-only"

import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { propertyFormSends, propertyForms } from "@/db/schema"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const propertyListIdRaw = searchParams.get("propertyListId")

  if (!propertyListIdRaw) {
    return adminJsonError("Missing required query param: propertyListId", 400)
  }

  const propertyListId = Number(propertyListIdRaw)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Invalid propertyListId", 400)
  }

  try {
    const rows = await db
      .select({
        propertyFormSendId: propertyFormSends.propertyFormSendId,
        propertyFormId: propertyFormSends.propertyFormId,
        formName: propertyForms.formName,
        fileLink: propertyForms.fileLink,
        recipientEmail: propertyFormSends.recipientEmail,
        recipientName: propertyFormSends.recipientName,
        messageSent: propertyFormSends.messageSent,
        driveFileLink: propertyFormSends.driveFileLink,
        prefillValues: propertyFormSends.prefillValues,
        prefillStrategy: propertyForms.prefillStrategy,
        sentAt: propertyFormSends.sentAt,
      })
      .from(propertyFormSends)
      .innerJoin(propertyForms, eq(propertyFormSends.propertyFormId, propertyForms.propertyFormId))
      .where(eq(propertyFormSends.propertyListId, propertyListId))
      .orderBy(desc(propertyFormSends.sentAt))

    return NextResponse.json({ items: rows })
  } catch (cause) {
    console.error(`[GET /api/admin/property-form-sends?propertyListId=${propertyListId}]`, cause)
    return adminJsonError("Failed to load send history", 500)
  }
}
