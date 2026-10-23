import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { gmailOauthTokens } from "@/db/schema"
import { getGmailAccessToken } from "@/lib/gmail-client"
import { getOrCreateDriveFolder } from "./google-drive-folders"

export { getGmailAccessToken as getDriveAccessToken }

export type { DriveFileItem } from "./google-drive-folders"
export {
  getOrCreateDriveFolder,
  findDriveFolder,
  listFilesInFolder,
  listSubfoldersInFolder,
} from "./google-drive-folders"

export type { DriveUploadResult } from "./google-drive-files"
export {
  initiateResumableUpload,
  uploadFileToDrive,
  moveFileToDrive,
  downloadFileFromDrive,
  deleteFileFromDrive,
  shareFilePublicly,
  verifyDriveFileInFolder,
} from "./google-drive-files"

/**
 * Finds or creates the shared "Email Attachments" Drive folder, persisting its ID to
 * gmail_oauth_tokens.email_attachments_folder_id so it is only looked up / created once.
 */
export async function findOrCreateEmailAttachmentsFolder(accessToken: string): Promise<string> {
  const [row] = await db
    .select({ folderId: gmailOauthTokens.emailAttachmentsFolderId })
    .from(gmailOauthTokens)
    .where(eq(gmailOauthTokens.id, 1))
    .limit(1)

  if (row?.folderId) return row.folderId

  const folderId = await getOrCreateDriveFolder(accessToken, "Email Attachments")

  await db
    .update(gmailOauthTokens)
    .set({ emailAttachmentsFolderId: folderId, updatedAt: new Date() })
    .where(eq(gmailOauthTokens.id, 1))

  return folderId
}

/**
 * Downloads a file from Drive and returns its name, MIME type, and raw bytes as a Buffer.
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<{ name: string; mimeType: string; data: Buffer }> {
  const [metaRes, bytesRes] = await Promise.all([
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ])

  if (!metaRes.ok) {
    const body = await metaRes.text()
    throw new Error(`Drive file metadata failed (${metaRes.status}): ${body}`)
  }
  if (!bytesRes.ok) {
    const body = await bytesRes.text()
    throw new Error(`Drive file download failed (${bytesRes.status}): ${body}`)
  }

  const { name, mimeType } = (await metaRes.json()) as { name: string; mimeType: string }
  const data = Buffer.from(await bytesRes.arrayBuffer())
  return { name, mimeType, data }
}
