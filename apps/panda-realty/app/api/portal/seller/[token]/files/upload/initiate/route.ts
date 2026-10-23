import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { portalTokens } from "@/db/schema"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { getOrCreateDriveFolder, initiateResumableUpload } from "@/lib/google-drive-client"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"
import { PROPERTY_ADMIN_FILE_UPLOAD_MAX_BYTES } from "@/lib/property-file-upload-constants"
import { getPropertyWithDriveAccess } from "@/lib/property-list-drive-access"

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params

  const [tokenRow] = await db
    .select({
      revokedAt: portalTokens.revokedAt,
      role: portalTokens.role,
      propertyListId: portalTokens.propertyListId,
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

  const result = await getPropertyWithDriveAccess(tokenRow.propertyListId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  const { prop, accessToken } = result

  const origin = request.headers.get("origin") ?? undefined

  try {
    const folderName = buildPropertyFolderName(prop.streetAddress, prop.suburb, prop.state, prop.postcode)
    const folderId = await getOrCreateDriveFolder(accessToken, folderName, PANDA_DRIVE_PARENT_FOLDER_ID)
    const uploadUri = await initiateResumableUpload(accessToken, fileName, mimeType, fileSize, origin, folderId)
    return NextResponse.json({ uploadUri })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to initiate Drive upload: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }
}
