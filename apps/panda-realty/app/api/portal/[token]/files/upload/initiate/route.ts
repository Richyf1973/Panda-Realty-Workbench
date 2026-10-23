import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { entities, pandaProperties, portalTokens, propertyEntities } from "@/db/schema"
import { getDriveAccessToken, getOrCreateDriveFolder, initiateResumableUpload } from "@/lib/google-drive-client"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"
import { PROPERTY_ADMIN_FILE_UPLOAD_MAX_BYTES } from "@/lib/property-file-upload-constants"

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params

  const [tokenRow] = await db
    .select({
      revokedAt: portalTokens.revokedAt,
      propertyEntityId: portalTokens.propertyEntityId,
      propertyListId: portalTokens.propertyListId,
    })
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!tokenRow) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (tokenRow.revokedAt) return NextResponse.json({ error: "Token revoked" }, { status: 410 })
  if (!tokenRow.propertyEntityId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { fileName, mimeType, fileSize } = body as Record<string, unknown>

  if (typeof fileName !== "string" || !fileName.trim()) {
    return NextResponse.json({ error: "Missing required field: fileName" }, { status: 400 })
  }
  if (typeof mimeType !== "string" || !mimeType.trim()) {
    return NextResponse.json({ error: "Missing required field: mimeType" }, { status: 400 })
  }
  if (typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json({ error: "Missing or invalid field: fileSize" }, { status: 400 })
  }
  if (fileSize > PROPERTY_ADMIN_FILE_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum size is 100 MB." },
      { status: 400 },
    )
  }

  const [entityRow] = await db
    .select({
      entityName: entities.entityName,
      propertyListId: propertyEntities.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(entities.entityId, propertyEntities.entityId))
    .leftJoin(pandaProperties, eq(pandaProperties.propertyListId, propertyEntities.propertyListId))
    .where(eq(propertyEntities.propertyEntityId, tokenRow.propertyEntityId))
    .limit(1)

  if (!entityRow) return NextResponse.json({ error: "Entity not found" }, { status: 404 })

  let accessToken: string
  try {
    accessToken = await getDriveAccessToken()
  } catch {
    return NextResponse.json(
      { error: "Google Drive is not connected. Please reconnect your Google account to enable file uploads." },
      { status: 503 },
    )
  }

  const origin = request.headers.get("origin") ?? undefined

  try {
    let folderId: string

    if (
      entityRow.propertyListId != null &&
      entityRow.streetAddress &&
      entityRow.suburb &&
      entityRow.state &&
      entityRow.postcode
    ) {
      const propertyFolderName = buildPropertyFolderName(
        entityRow.streetAddress,
        entityRow.suburb,
        entityRow.state,
        entityRow.postcode,
      )
      const propertyFolderId = await getOrCreateDriveFolder(
        accessToken,
        propertyFolderName,
        PANDA_DRIVE_PARENT_FOLDER_ID,
      )
      folderId = await getOrCreateDriveFolder(accessToken, entityRow.entityName, propertyFolderId)
    } else {
      folderId = await getOrCreateDriveFolder(
        accessToken,
        entityRow.entityName,
        PANDA_DRIVE_PARENT_FOLDER_ID,
      )
    }

    const uploadUri = await initiateResumableUpload(accessToken, fileName, mimeType, fileSize, origin, folderId)
    return NextResponse.json({ uploadUri })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to initiate Drive upload: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}
