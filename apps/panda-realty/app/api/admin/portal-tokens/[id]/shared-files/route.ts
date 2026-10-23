import "server-only"

import { and, desc, eq, isNotNull, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import {
  portalFileSignRequests,
  portalTokens,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

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

  const [listFilesRaw, entityFilesRaw] = await Promise.all([
    db
      .select({
        driveFileId: propertyListFiles.googleDriveFileId,
        fileName: propertyListFiles.fileName,
      })
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListId, token.propertyListId),
          eq(propertyListFiles.sharedWithPortal, true),
          isNotNull(propertyListFiles.googleDriveFileId),
        ),
      ),

    token.propertyEntityId != null
      ? db
          .select({
            driveFileId: propertyEntityFiles.googleDriveFileId,
            fileName: propertyEntityFiles.fileName,
          })
          .from(propertyEntityFiles)
          .where(
            and(
              eq(propertyEntityFiles.propertyEntityId, token.propertyEntityId),
              eq(propertyEntityFiles.sharedWithPortal, true),
              isNotNull(propertyEntityFiles.googleDriveFileId),
            ),
          )
      : Promise.resolve([]),
  ])

  const allFiles = [
    ...listFilesRaw.map((f) => ({ driveFileId: f.driveFileId!, fileName: f.fileName })),
    ...entityFilesRaw.map((f) => ({ driveFileId: f.driveFileId!, fileName: f.fileName })),
  ]

  if (allFiles.length === 0) {
    return NextResponse.json([])
  }

  const driveFileIds = allFiles.map((f) => f.driveFileId)

  const signRows = await db
    .select({
      fileId: portalFileSignRequests.fileId,
      signatureStatus: portalFileSignRequests.signatureStatus,
      id: portalFileSignRequests.id,
      signedAt: portalFileSignRequests.signedAt,
    })
    .from(portalFileSignRequests)
    .where(
      and(
        eq(portalFileSignRequests.portalTokenId, portalTokenId),
        inArray(portalFileSignRequests.fileId, driveFileIds),
      ),
    )
    .orderBy(desc(portalFileSignRequests.id))

  // Latest sign request per driveFileId (rows are ordered desc by id)
  const latestByFileId = new Map<string, { signatureStatus: string; signRequestId: number; signedAt: Date | null }>()
  for (const row of signRows) {
    if (!latestByFileId.has(row.fileId)) {
      latestByFileId.set(row.fileId, { signatureStatus: row.signatureStatus, signRequestId: row.id, signedAt: row.signedAt })
    }
  }

  const result = allFiles.map((f) => {
    const sign = latestByFileId.get(f.driveFileId)
    return {
      driveFileId: f.driveFileId,
      fileName: f.fileName,
      signatureStatus: sign?.signatureStatus ?? null,
      signRequestId: sign?.signRequestId ?? null,
      signedAt: sign?.signedAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json(result)
}
