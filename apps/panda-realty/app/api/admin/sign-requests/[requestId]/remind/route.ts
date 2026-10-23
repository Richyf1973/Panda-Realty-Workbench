import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { portalFileSignRequests } from "@/db/schema"
import { sendReminder } from "@/lib/adobe-sign-client"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ requestId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { requestId } = await context.params
  const id = parseInt(requestId, 10)
  if (isNaN(id)) return adminJsonError("Invalid requestId", 400)

  const [row] = await db
    .select({
      id: portalFileSignRequests.id,
      adobeSignAgreementId: portalFileSignRequests.adobeSignAgreementId,
      signatureStatus: portalFileSignRequests.signatureStatus,
    })
    .from(portalFileSignRequests)
    .where(eq(portalFileSignRequests.id, id))
    .limit(1)

  if (!row) return adminJsonError("Sign request not found", 404)
  if (row.signatureStatus !== "pending") {
    return adminJsonError("Reminders can only be sent for pending agreements", 422)
  }

  try {
    await sendReminder(row.adobeSignAgreementId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return adminJsonError(`Failed to send reminder: ${msg}`, 500)
  }

  return NextResponse.json({ ok: true })
}
