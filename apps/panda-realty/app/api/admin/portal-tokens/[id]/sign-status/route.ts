import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import {
  portalFileSignRequests,
  portalTokens,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import { getAgreementStatus } from "@/lib/adobe-sign-client"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

// Adobe Sign v6 status values — only statuses actually returned by the AU1 e-signature flow
const SIGNED_STATUSES = new Set(["SIGNED"])
const CANCELLED_STATUSES = new Set(["CANCELLED", "RECALLED", "DECLINED"])

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const portalTokenId = parseInt(id, 10)
  if (isNaN(portalTokenId)) return adminJsonError("Invalid id", 400)

  const [token] = await db
    .select({
      portalTokenId: portalTokens.portalTokenId,
      propertyListId: portalTokens.propertyListId,
      propertyEntityId: portalTokens.propertyEntityId,
    })
    .from(portalTokens)
    .where(eq(portalTokens.portalTokenId, portalTokenId))
    .limit(1)

  if (!token) return adminJsonError("Token not found", 404)

  // Collect all shared driveFileIds so we can scope the sign request lookup
  const [listFilesRaw, entityFilesRaw] = await Promise.all([
    db
      .select({ driveFileId: propertyListFiles.googleDriveFileId })
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListId, token.propertyListId),
          eq(propertyListFiles.sharedWithPortal, true),
        ),
      ),
    token.propertyEntityId != null
      ? db
          .select({ driveFileId: propertyEntityFiles.googleDriveFileId })
          .from(propertyEntityFiles)
          .where(
            and(
              eq(propertyEntityFiles.propertyEntityId, token.propertyEntityId),
              eq(propertyEntityFiles.sharedWithPortal, true),
            ),
          )
      : Promise.resolve([]),
  ])

  const driveFileIds = [
    ...listFilesRaw.map((f) => f.driveFileId).filter((id): id is string => id != null),
    ...entityFilesRaw.map((f) => f.driveFileId).filter((id): id is string => id != null),
  ]

  if (driveFileIds.length === 0) return NextResponse.json({ synced: 0 })

  // Get the latest pending sign request per file
  const pendingRows = await db
    .select({
      id: portalFileSignRequests.id,
      fileId: portalFileSignRequests.fileId,
      adobeSignAgreementId: portalFileSignRequests.adobeSignAgreementId,
    })
    .from(portalFileSignRequests)
    .where(
      and(
        eq(portalFileSignRequests.portalTokenId, portalTokenId),
        eq(portalFileSignRequests.signatureStatus, "pending"),
        inArray(portalFileSignRequests.fileId, driveFileIds),
      ),
    )
    .orderBy(desc(portalFileSignRequests.id))

  // Deduplicate: only the latest pending request per file
  const seen = new Set<string>()
  const toCheck = pendingRows.filter((r) => {
    if (seen.has(r.fileId)) return false
    seen.add(r.fileId)
    return true
  })

  let synced = 0
  await Promise.allSettled(
    toCheck.map(async (row) => {
      try {
        const { status } = await getAgreementStatus(row.adobeSignAgreementId)
        const now = new Date()
        if (SIGNED_STATUSES.has(status)) {
          await db
            .update(portalFileSignRequests)
            .set({ signatureStatus: "signed", signedAt: now })
            .where(eq(portalFileSignRequests.id, row.id))
          synced++
        } else if (CANCELLED_STATUSES.has(status)) {
          await db
            .update(portalFileSignRequests)
            .set({ signatureStatus: "cancelled", cancelledAt: now })
            .where(eq(portalFileSignRequests.id, row.id))
          synced++
        }
      } catch {
        // Non-fatal: log and continue — webhook is the primary delivery mechanism
        console.error(`[sign-status] Failed to check status for agreement ${row.adobeSignAgreementId}`)
      }
    }),
  )

  return NextResponse.json({ synced })
}
