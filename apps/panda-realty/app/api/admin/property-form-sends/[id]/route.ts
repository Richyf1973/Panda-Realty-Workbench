import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties, propertyFormSends, propertyForms } from "@/db/schema"
import { getDriveAccessToken } from "@/lib/google-drive-client"
import { fillAndUploadToDrive } from "@/lib/pdf-fill-and-upload"

interface PatchBody {
  prefillValues: Record<string, string | undefined>
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await params
  const sendId = Number(id)
  if (!Number.isFinite(sendId) || sendId <= 0) return adminJsonError("Invalid id", 400)

  let body: PatchBody
  try {
    body = (await request.json()) as PatchBody
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }
  const { prefillValues } = body
  if (!prefillValues || typeof prefillValues !== "object") {
    return adminJsonError("prefillValues is required", 400)
  }

  const [sendRow] = await db
    .select({
      propertyFormSendId: propertyFormSends.propertyFormSendId,
      propertyFormId: propertyFormSends.propertyFormId,
      propertyListId: propertyFormSends.propertyListId,
    })
    .from(propertyFormSends)
    .where(eq(propertyFormSends.propertyFormSendId, sendId))
    .limit(1)

  if (!sendRow) return adminJsonError("Send record not found", 404)

  const [form] = await db
    .select({
      formName: propertyForms.formName,
      googleDriveFileId: propertyForms.googleDriveFileId,
      prefillStrategy: propertyForms.prefillStrategy,
    })
    .from(propertyForms)
    .where(eq(propertyForms.propertyFormId, sendRow.propertyFormId))
    .limit(1)

  if (!form) return adminJsonError("Form not found", 404)
  if (!form.prefillStrategy || !form.googleDriveFileId) {
    return adminJsonError("Form does not support prefill", 422)
  }

  const [property] = await db
    .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, sendRow.propertyListId))
    .limit(1)

  if (!property) return adminJsonError("Property not found", 404)

  try {
    const driveToken = await getDriveAccessToken()
    const { webViewLink } = await fillAndUploadToDrive(
      form,
      { streetAddress: property.streetAddress, suburb: property.suburb, propertyListId: sendRow.propertyListId },
      prefillValues,
      driveToken,
    )

    await db
      .update(propertyFormSends)
      .set({ driveFileLink: webViewLink, prefillValues: prefillValues as Record<string, string> })
      .where(eq(propertyFormSends.propertyFormSendId, sendId))

    return NextResponse.json({ propertyFormSendId: sendId, driveFileLink: webViewLink })
  } catch (err) {
    console.error("[PATCH /api/admin/property-form-sends/:id]", err)
    return adminJsonError("Failed to save PDF to Drive — check Google Drive connection.", 503)
  }
}
