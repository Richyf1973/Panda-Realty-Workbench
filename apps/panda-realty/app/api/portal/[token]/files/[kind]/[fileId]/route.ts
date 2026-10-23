import "server-only"

import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { portalTokens, propertyEntities, propertyEntityFiles, propertyListFiles } from "@/db/schema"
import { getDriveAccessToken, downloadDriveFile } from "@/lib/google-drive-client"

type RouteContext = { params: Promise<{ token: string; kind: string; fileId: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { token, kind, fileId: fileIdStr } = await context.params

  if (kind !== "entity" && kind !== "property") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 })
  }

  const fileId = Number(fileIdStr)
  if (!Number.isFinite(fileId) || fileId <= 0) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 })
  }

  const [tokenRow] = await db
    .select({
      revokedAt: portalTokens.revokedAt,
      propertyListId: portalTokens.propertyListId,
      propertyEntityId: portalTokens.propertyEntityId,
    })
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!tokenRow) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (tokenRow.revokedAt) return NextResponse.json({ error: "Token revoked" }, { status: 403 })

  const isDownload = new URL(request.url).searchParams.get("download") === "1"

  if (kind === "property") {
    const [file] = await db
      .select()
      .from(propertyListFiles)
      .where(
        and(
          eq(propertyListFiles.propertyListFileId, fileId),
          eq(propertyListFiles.propertyListId, tokenRow.propertyListId),
        ),
      )
      .limit(1)

    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!file.sharedWithPortal) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    return streamOrRedirect({ googleDriveFileId: file.googleDriveFileId, fileLink: file.fileLink, fileName: file.fileName, isDownload })
  }

  // kind === "entity"
  const [file] = await db
    .select({
      googleDriveFileId: propertyEntityFiles.googleDriveFileId,
      fileLink: propertyEntityFiles.fileLink,
      fileName: propertyEntityFiles.fileName,
      propertyEntityId: propertyEntityFiles.propertyEntityId,
      sharedWithPortal: propertyEntityFiles.sharedWithPortal,
      source: propertyEntityFiles.source,
    })
    .from(propertyEntityFiles)
    .where(eq(propertyEntityFiles.propertyEntityFileId, fileId))
    .limit(1)

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Allow buyer to access their own uploaded files without share toggle
  if (
    file.source === "buyer_upload" &&
    tokenRow.propertyEntityId != null &&
    file.propertyEntityId === tokenRow.propertyEntityId
  ) {
    return streamOrRedirect({ googleDriveFileId: file.googleDriveFileId, fileLink: file.fileLink, fileName: file.fileName, isDownload })
  }

  const [link] = await db
    .select({ propertyListId: propertyEntities.propertyListId })
    .from(propertyEntities)
    .where(eq(propertyEntities.propertyEntityId, file.propertyEntityId))
    .limit(1)

  if (!link || link.propertyListId !== tokenRow.propertyListId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!file.sharedWithPortal) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return streamOrRedirect({ googleDriveFileId: file.googleDriveFileId, fileLink: file.fileLink, fileName: file.fileName, isDownload })
}

async function streamOrRedirect({
  googleDriveFileId,
  fileLink,
  fileName,
  isDownload,
}: {
  googleDriveFileId: string | null
  fileLink: string | null
  fileName: string | null
  isDownload: boolean
}) {
  if (googleDriveFileId) {
    try {
      const accessToken = await getDriveAccessToken()
      const { name, mimeType, data } = await downloadDriveFile(accessToken, googleDriveFileId)
      const disposition = isDownload
        ? `attachment; filename="${encodeURIComponent(fileName ?? name)}"`
        : `inline; filename="${encodeURIComponent(fileName ?? name)}"`
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": disposition,
          "Content-Length": String(data.length),
          "Cache-Control": "private, max-age=300",
        },
      })
    } catch (err) {
      console.error("[portal file proxy] Drive download failed", err)
      return NextResponse.json({ error: "File unavailable" }, { status: 502 })
    }
  }

  if (fileLink) {
    return NextResponse.redirect(fileLink)
  }

  return NextResponse.json({ error: "No file source" }, { status: 404 })
}
