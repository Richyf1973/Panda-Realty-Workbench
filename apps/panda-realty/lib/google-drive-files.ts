import "server-only"

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
}

/**
 * Initiates a Drive resumable upload session.
 * Returns the upload URI (Location header) the client uses to PUT the file.
 * The `fields` query param is baked in so the final PUT response includes id + webViewLink.
 */
export async function initiateResumableUpload(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  /** Browser origin (e.g. "http://localhost:3004"). When provided, Google enables
   *  CORS on the upload URI so the client can PUT directly from the browser. */
  origin?: string,
  /** Drive folder ID to upload into. When provided, the file is created inside
   *  that folder instead of the service account root. */
  folderId?: string,
): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": mimeType,
    "X-Upload-Content-Length": String(fileSize),
  }
  if (origin) headers["Origin"] = origin

  const metadata: Record<string, unknown> = { name: fileName, mimeType }
  if (folderId) metadata.parents = [folderId]

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
    {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive resumable initiate failed (${res.status}): ${body}`)
  }

  const location = res.headers.get("Location")
  if (!location) throw new Error("Drive resumable initiate: missing Location header")
  return location
}

/**
 * Uploads a file to Google Drive using the multipart upload API.
 * Returns the Drive file ID and a web view link.
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  folderId?: string,
): Promise<DriveUploadResult> {
  const metadataObj: Record<string, unknown> = { name: fileName, mimeType }
  if (folderId) metadataObj.parents = [folderId]
  const metadata = JSON.stringify(metadataObj)

  const boundary = "drive_upload_boundary"
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadataPart =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    metadata +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`

  const metadataBytes = new TextEncoder().encode(metadataPart)
  const closeBytes = new TextEncoder().encode(closeDelimiter)
  const fileBytes = new Uint8Array(fileBuffer)

  const combined = new Uint8Array(
    metadataBytes.length + fileBytes.length + closeBytes.length,
  )
  combined.set(metadataBytes, 0)
  combined.set(fileBytes, metadataBytes.length)
  combined.set(closeBytes, metadataBytes.length + fileBytes.length)

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive upload failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { id: string; webViewLink: string }
  return { fileId: data.id, webViewLink: data.webViewLink }
}

/**
 * Moves a Drive file into a new parent folder.
 * Fetches the file's current parents first so they can be removed atomically.
 * No-ops gracefully if the file is already inside the target folder.
 */
export async function moveFileToDrive(
  accessToken: string,
  fileId: string,
  newParentFolderId: string,
): Promise<void> {
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!metaRes.ok) {
    const body = await metaRes.text()
    throw new Error(`Drive file metadata fetch failed (${metaRes.status}): ${body}`)
  }
  const { parents = [] } = (await metaRes.json()) as { parents?: string[] }

  if (parents.includes(newParentFolderId)) return

  const removeParents = parents.join(",")
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(newParentFolderId)}${removeParents ? `&removeParents=${encodeURIComponent(removeParents)}` : ""}&fields=id`

  const moveRes = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!moveRes.ok) {
    const body = await moveRes.text()
    throw new Error(`Drive file move failed (${moveRes.status}): ${body}`)
  }
}

/**
 * Downloads a file from Google Drive and returns its raw bytes.
 */
export async function downloadFileFromDrive(
  accessToken: string,
  fileId: string,
): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive download failed (${res.status}): ${body}`)
  }

  return res.arrayBuffer()
}

/**
 * Verifies that a Drive file is a direct child of the expected folder.
 * Returns the file's webViewLink if ownership is confirmed, null otherwise
 * (file not found, not accessible, or wrong parent).
 */
export async function verifyDriveFileInFolder(
  accessToken: string,
  fileId: string,
  expectedFolderId: string,
): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=parents,webViewLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { parents?: string[]; webViewLink?: string }
  if (!data.parents?.includes(expectedFolderId)) return null
  return data.webViewLink ?? null
}

/**
 * Permanently deletes a file from Google Drive.
 * No-ops gracefully if the file is already gone (404).
 */
export async function deleteFileFromDrive(
  accessToken: string,
  fileId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (res.status === 404) return // already gone — treat as success
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive delete failed (${res.status}): ${body}`)
  }
}

/**
 * Sets a Drive file permission to "anyone with link can view".
 */
export async function shareFilePublicly(
  accessToken: string,
  fileId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive share failed (${res.status}): ${body}`)
  }
}
