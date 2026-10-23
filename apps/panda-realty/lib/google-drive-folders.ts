import "server-only"

export interface DriveFileItem {
  id: string
  name: string
  mimeType: string
  /** File size in bytes (as string from Drive API). */
  size: string | undefined
  webViewLink: string | undefined
}

/**
 * Finds or creates a Drive folder by name under an optional parent.
 * Returns the folder's file ID.
 */
export async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string,
): Promise<string> {
  const parentClause = parentFolderId ? ` and '${parentFolderId}' in parents` : ""
  const safeName = folderName.replace(/'/g, "\\'")
  const query = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false${parentClause}`

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!searchRes.ok) {
    const body = await searchRes.text()
    throw new Error(`Drive folder search failed (${searchRes.status}): ${body}`)
  }

  const { files } = (await searchRes.json()) as { files: { id: string }[] }
  if (files.length > 0) return files[0].id

  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  }
  if (parentFolderId) metadata.parents = [parentFolderId]

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  })

  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`Drive folder create failed (${createRes.status}): ${body}`)
  }

  const { id } = (await createRes.json()) as { id: string }
  return id
}

/**
 * Finds a Drive folder by name under an optional parent.
 * Returns the folder's file ID, or null if not found. Never creates.
 */
export async function findDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string,
): Promise<string | null> {
  const escapedName = folderName.replace(/'/g, "\\'")
  const parentClause = parentFolderId ? ` and '${parentFolderId}' in parents` : ""
  const query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false${parentClause}`

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive folder search failed (${res.status}): ${body}`)
  }

  const { files } = (await res.json()) as { files: { id: string }[] }
  return files.length > 0 ? files[0].id : null
}

/**
 * Lists all non-folder files directly inside a Drive folder, with pagination.
 */
export async function listFilesInFolder(
  accessToken: string,
  folderId: string,
): Promise<DriveFileItem[]> {
  // Intentionally omit the mimeType filter from the Drive query — the != operator
  // can silently drop image/* files in some Drive API responses. Filter folders
  // client-side after receiving the full item list instead.
  const query = `'${folderId}' in parents and trashed=false`
  const fields = "nextPageToken,files(id,name,mimeType,size,webViewLink)"
  const results: DriveFileItem[] = []
  let pageToken: string | undefined

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files")
    url.searchParams.set("q", query)
    url.searchParams.set("fields", fields)
    url.searchParams.set("pageSize", "1000")
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Drive list files failed (${res.status}): ${body}`)
    }

    const data = (await res.json()) as { nextPageToken?: string; files?: DriveFileItem[] }
    results.push(...(data.files ?? []).filter((f) => f.mimeType !== "application/vnd.google-apps.folder"))
    pageToken = data.nextPageToken
  } while (pageToken)

  return results
}

/**
 * Lists all subfolders directly inside a Drive folder, with pagination.
 */
export async function listSubfoldersInFolder(
  accessToken: string,
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const fields = "nextPageToken,files(id,name)"
  const results: { id: string; name: string }[] = []
  let pageToken: string | undefined

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files")
    url.searchParams.set("q", query)
    url.searchParams.set("fields", fields)
    url.searchParams.set("pageSize", "1000")
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Drive list subfolders failed (${res.status}): ${body}`)
    }

    const data = (await res.json()) as { nextPageToken?: string; files: { id: string; name: string }[] }
    results.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)

  return results
}
