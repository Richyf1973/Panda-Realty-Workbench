/**
 * Client-side two-phase upload for email attachments:
 *   1. POST metadata to /api/admin/gmail/attachments/initiate-upload → get Drive upload URI
 *   2. XHR PUT file directly to Drive URI (supports upload progress)
 * Returns { driveFileId } on success or { error } string on failure.
 */
export async function clientEmailAttachmentUpload(
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ driveFileId: string } | { error: string }> {
  if (file.size === 0) return { error: `"${file.name}" is empty.` }

  const mimeType = file.type || "application/octet-stream"

  // Step 1 — get Drive resumable upload URI from server
  let uploadUri: string
  try {
    const res = await fetch("/api/admin/gmail/attachments/initiate-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, mimeType, fileSize: file.size }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.status === 503) {
        return { error: "Google Drive is not connected. Please reconnect your Google account." }
      }
      return { error: data.error ?? `Failed to initiate upload (${res.status})` }
    }
    const data = (await res.json()) as { uploadUri: string }
    uploadUri = data.uploadUri
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to initiate upload." }
  }

  // Step 2 — XHR PUT directly to Drive (supports upload progress)
  try {
    const driveFileId = await xhrPutToDrive(uploadUri, file, mimeType, onProgress)
    return { driveFileId }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload to Google Drive failed." }
  }
}

function xhrPutToDrive(
  url: string,
  file: File,
  mimeType: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { id?: string }
          if (!data.id) {
            reject(new Error("Unexpected response from Google Drive"))
          } else {
            resolve(data.id)
          }
        } catch {
          reject(new Error("Invalid response from Google Drive"))
        }
      } else {
        reject(new Error(`Google Drive upload failed (${xhr.status})`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error during upload to Google Drive")))
    xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled")))

    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", mimeType)
    xhr.send(file)
  })
}
