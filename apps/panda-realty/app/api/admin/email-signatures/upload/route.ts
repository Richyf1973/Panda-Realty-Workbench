import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"

const SIGNATURE_IMAGE_BUCKET = "email-signatures"

function sanitizeFileName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  const [baseName, ...rest] = trimmed.split(".")
  const extension = rest.length > 0 ? `.${rest.pop()}` : ""
  const safeBaseName = baseName.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
  return `${safeBaseName || "signature-image"}${extension}`
}

async function ensureBucketExists() {
  const client = createAdminClient()
  const { data: bucket, error } = await client.storage.getBucket(SIGNATURE_IMAGE_BUCKET)

  if (bucket) return client

  if (error && !/not found/i.test(error.message)) {
    throw new Error(error.message || "Could not access Supabase storage.")
  }

  const { error: createError } = await client.storage.createBucket(SIGNATURE_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  })

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message || "Could not create Supabase storage bucket.")
  }

  return client
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return adminJsonError("Invalid form data", 400)
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return adminJsonError("Missing uploaded file", 400)
  }

  if (!file.type.startsWith("image/")) {
    return adminJsonError("Only image uploads are supported for signatures.", 400)
  }

  try {
    const storage = await ensureBucketExists()
    const storagePath = `signatures/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
    const uploadBytes = new Uint8Array(await file.arrayBuffer())
    const { error: uploadError } = await storage.storage
      .from(SIGNATURE_IMAGE_BUCKET)
      .upload(storagePath, uploadBytes, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message || "Upload failed.")
    }

    const { data: publicUrlData } = storage.storage
      .from(SIGNATURE_IMAGE_BUCKET)
      .getPublicUrl(storagePath)

    if (!publicUrlData.publicUrl) {
      throw new Error("Supabase storage did not return a public image URL.")
    }

    return NextResponse.json({
      fileUrl: publicUrlData.publicUrl,
      previewUrl: publicUrlData.publicUrl,
      storagePath,
      bucket: SIGNATURE_IMAGE_BUCKET,
    })
  } catch (err) {
    return adminJsonError(
      err instanceof Error ? err.message : "Upload failed.",
      500,
    )
  }
}
