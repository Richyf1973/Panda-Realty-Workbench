const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

export interface DriveResumableUploadResult {
  googleDriveFileId: string
  fileLink: string
  fileName: string
  fileSize: number
  fileType: string
}

/**
 * Client-side helper for the two-phase Drive upload flow:
 *   1. POST to initiateUrl → server returns { uploadUri }
 *   2. XHR PUT file directly to Drive URI (with progress callbacks)
 *   3. POST Drive result to recordUrl → server shares + persists
 *
 * Returns { error, shareWarning }. error is non-null on failure; shareWarning is set when
 * the file was persisted but Google Drive sharing failed (file may not be publicly accessible).
 * The caller stores the File for retry — just call this again with the same file.
 */
export async function clientDriveResumableUpload(options: {
  file: File
  initiateUrl: string
  initiateExtraFields?: Record<string, string | number>
  recordUrl: string
  recordExtraFields?: Record<string, string | number>
  onProgress: (percent: number) => void
  onRecordSuccess: (data: Record<string, unknown>) => Promise<void>
}): Promise<{ error: string | null; shareWarning: string | null }> {
  const { file, initiateUrl, initiateExtraFields, recordUrl, recordExtraFields, onProgress, onRecordSuccess } = options

  if (file.size > MAX_BYTES) {
    return { error: `"${file.name}" is too large (${formatMB(file.size)} MB). Maximum is 100 MB.`, shareWarning: null }
  }
  if (file.size === 0) {
    return { error: `"${file.name}" is empty.`, shareWarning: null }
  }

  const mimeType = file.type || "application/octet-stream"

  // Step 1 — get Drive resumable upload URI from server
  let uploadUri: string
  try {
    const res = await fetch(initiateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        ...initiateExtraFields,
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.status === 503) {
        return { error: "Google Drive is not connected. Please reconnect your Google account.", shareWarning: null }
      }
      return { error: data.error ?? `Failed to initiate upload (${res.status})`, shareWarning: null }
    }
    const data = (await res.json()) as { uploadUri: string }
    uploadUri = data.uploadUri
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to initiate upload.", shareWarning: null }
  }

  // Step 2 — XHR PUT directly to Drive (supports upload progress)
  let driveResult: { id: string; webViewLink: string }
  try {
    driveResult = await xhrPutToDrive(uploadUri, file, mimeType, onProgress)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload to Google Drive failed.", shareWarning: null }
  }

  // Step 3 — record / finalize on server (share + persist)
  try {
    const res = await fetch(recordUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleDriveFileId: driveResult.id,
        fileLink: driveResult.webViewLink,
        fileName: file.name,
        fileSize: file.size,
        fileType: mimeType,
        ...recordExtraFields,
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return { error: data.error ?? `Failed to save file record (${res.status})`, shareWarning: null }
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    await onRecordSuccess(data)
    return { error: null, shareWarning: typeof data.shareWarning === "string" ? data.shareWarning : null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save file record.", shareWarning: null }
  }
}

function xhrPutToDrive(
  url: string,
  file: File,
  mimeType: string,
  onProgress: (percent: number) => void,
): Promise<{ id: string; webViewLink: string }> {
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
          const data = JSON.parse(xhr.responseText) as { id: string; webViewLink: string }
          if (!data.id || !data.webViewLink) {
            reject(new Error("Unexpected response from Google Drive"))
          } else {
            resolve(data)
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

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}
