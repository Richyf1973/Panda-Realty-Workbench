import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { portalTokens, propertyListFiles } from "@/db/schema"
import { sendPortalUploadNotification } from "@/lib/portal-notifications"
import { getOrCreateDriveFolder, verifyDriveFileInFolder } from "@/lib/google-drive-client"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"
import { getPropertyWithDriveAccess } from "@/lib/property-list-drive-access"

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params

  const [tokenRow] = await db
    .select({
      revokedAt: portalTokens.revokedAt,
      role: portalTokens.role,
      propertyEntityId: portalTokens.propertyEntityId,
      propertyListId: portalTokens.propertyListId,
      portalTokenId: portalTokens.portalTokenId,
    })
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!tokenRow) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (tokenRow.role !== "seller") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (tokenRow.revokedAt) return NextResponse.json({ error: "Token revoked" }, { status: 410 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // fileLink is intentionally excluded — computed server-side from verified Drive file
  const { googleDriveFileId, fileName, fileSize: fileSizeRaw, fileType } =
    body as Record<string, unknown>

  if (typeof googleDriveFileId !== "string" || !googleDriveFileId.trim()) {
    return NextResponse.json({ error: "Missing required field: googleDriveFileId" }, { status: 400 })
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    return NextResponse.json({ error: "Missing required field: fileName" }, { status: 400 })
  }
  const fileSize = Number(fileSizeRaw)
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "Missing or invalid field: fileSize" }, { status: 400 })
  }
  if (typeof fileType !== "string" || !fileType.trim()) {
    return NextResponse.json({ error: "Missing required field: fileType" }, { status: 400 })
  }

  // Re-derive the Drive folder for this property (same logic as initiate) so we can
  // verify the uploaded file actually lives there before recording it.
  const result = await getPropertyWithDriveAccess(tokenRow.propertyListId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  const { prop, accessToken } = result

  let folderId: string
  try {
    const folderName = buildPropertyFolderName(prop.streetAddress, prop.suburb, prop.state, prop.postcode)
    folderId = await getOrCreateDriveFolder(accessToken, folderName, PANDA_DRIVE_PARENT_FOLDER_ID)
  } catch (err) {
    console.error("[portal/seller/upload/record POST] Drive folder resolution failed", err)
    return NextResponse.json({ error: "Failed to resolve Drive folder" }, { status: 502 })
  }

  // Confirm the file is a child of the expected folder — rejects any client-supplied fileId
  // that points outside this property's folder.
  const webViewLink = await verifyDriveFileInFolder(accessToken, googleDriveFileId, folderId)
  if (webViewLink === null) {
    return NextResponse.json(
      { error: "File not found in expected Drive folder" },
      { status: 403 },
    )
  }

  try {
    const [inserted] = await db
      .insert(propertyListFiles)
      .values({
        propertyListId: tokenRow.propertyListId,
        fileType,
        fileLink: webViewLink,
        fileName,
        fileSize,
        googleDriveFileId,
        source: "seller_upload",
      })
      .returning()

    void sendPortalUploadNotification(tokenRow, fileName, "seller", new URL(request.url).origin).catch((err) => {
      console.error("[portal/seller/upload/record POST] notification failed", err)
    })

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[portal/seller/upload/record POST] DB insert failed", err)
    return NextResponse.json({ error: "Failed to save file record" }, { status: 500 })
  }
}
