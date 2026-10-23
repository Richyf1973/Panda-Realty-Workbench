import "server-only"

import { and, eq, isNotNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import {
  entities,
  portalFileSignRequests,
  portalTokens,
  propertyEntities,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import { createAgreement } from "@/lib/adobe-sign-client"
import { getSessionUser } from "@/lib/auth/session"

type RouteContext = { params: Promise<{ id: string }> }

const bodySchema = z.object({ fileId: z.string().min(1) })

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await context.params
  const portalTokenId = parseInt(id, 10)
  if (isNaN(portalTokenId)) return adminJsonError("Invalid id", 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON", 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return adminJsonError("fileId is required", 400)

  const { fileId } = parsed.data

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

  // Security: verify fileId belongs to this property (sharedWithPortal=true)
  const [listMatch] = await db
    .select({ driveFileId: propertyListFiles.googleDriveFileId })
    .from(propertyListFiles)
    .where(
      and(
        eq(propertyListFiles.propertyListId, token.propertyListId),
        eq(propertyListFiles.googleDriveFileId, fileId),
        eq(propertyListFiles.sharedWithPortal, true),
        isNotNull(propertyListFiles.googleDriveFileId),
      ),
    )
    .limit(1)

  const entityMatch =
    !listMatch && token.propertyEntityId != null
      ? await db
          .select({ driveFileId: propertyEntityFiles.googleDriveFileId })
          .from(propertyEntityFiles)
          .where(
            and(
              eq(propertyEntityFiles.propertyEntityId, token.propertyEntityId),
              eq(propertyEntityFiles.googleDriveFileId, fileId),
              eq(propertyEntityFiles.sharedWithPortal, true),
              isNotNull(propertyEntityFiles.googleDriveFileId),
            ),
          )
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null

  if (!listMatch && !entityMatch) {
    return adminJsonError("File not found or not shared with portal", 404)
  }

  // Resolve signer email
  if (!token.propertyEntityId) {
    return adminJsonError("Portal token has no associated buyer entity", 422)
  }

  const [link] = await db
    .select({ emailAddress: entities.emailAddress })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(eq(propertyEntities.propertyEntityId, token.propertyEntityId))
    .limit(1)

  if (!link?.emailAddress) {
    return adminJsonError("No signer email on record — please add an email in the buyer profile", 422)
  }

  let agreementId: string
  try {
    const result = await createAgreement(fileId, link.emailAddress)
    agreementId = result.agreementId
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg.includes("Google Drive is not connected")) {
      return adminJsonError(msg, 503)
    }
    return adminJsonError(`Failed to create Adobe Sign agreement: ${msg}`, 500)
  }

  const [inserted] = await db
    .insert(portalFileSignRequests)
    .values({
      portalTokenId,
      fileId,
      adobeSignAgreementId: agreementId,
      signatureStatus: "pending",
      signerEmail: link.emailAddress,
    })
    .returning()

  return NextResponse.json(inserted)
}
