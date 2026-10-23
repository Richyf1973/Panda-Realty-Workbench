import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { getOrCreateDriveFolder } from "@/lib/google-drive-folders"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"
import { getPropertyWithDriveAccess } from "@/lib/property-list-drive-access"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const { propertyListId: propertyListIdRaw } = body as Record<string, unknown>
  const propertyListId = Number(propertyListIdRaw)
  if (!Number.isFinite(propertyListId) || propertyListId <= 0) {
    return adminJsonError("Missing or invalid field: propertyListId", 400)
  }

  const result = await getPropertyWithDriveAccess(propertyListId)
  if (!result.ok) return adminJsonError(result.error, result.status)
  const { prop, accessToken } = result

  try {
    const folderName = buildPropertyFolderName(prop.streetAddress, prop.suburb, prop.state, prop.postcode)
    const folderId = await getOrCreateDriveFolder(accessToken, folderName, PANDA_DRIVE_PARENT_FOLDER_ID)
    return NextResponse.json({ folderId, folderName })
  } catch (err) {
    return adminJsonError(
      `Failed to create Drive folder: ${err instanceof Error ? err.message : String(err)}`,
      502,
    )
  }
}
