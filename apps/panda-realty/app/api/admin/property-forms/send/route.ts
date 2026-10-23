import "server-only"

import { NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import {
  entities,
  pandaProperties,
  propertyEntities,
  propertyForms,
  propertyFormSends,
} from "@/db/schema"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"
import {
  getDriveAccessToken,
} from "@/lib/google-drive-client"
import { fillAndUploadToDrive } from "@/lib/pdf-fill-and-upload"

interface SendFormsRequestBody {
  propertyFormId: number
  propertyListId: number
  recipientEntityIds: number[]
  message?: string
  prefillValues?: Record<string, string | undefined>
  saveOnly?: boolean
}

async function syncForm6FieldsBack(
  propertyListId: number,
  prefillValues: Record<string, string | undefined>,
) {
  type UpdateSet = Partial<typeof pandaProperties.$inferInsert>
  const upd: UpdateSet = {}
  const pick = (formKey: string, dbKey: keyof UpdateSet) => {
    const v = prefillValues[formKey]
    if (v) (upd as Record<string, string>)[dbKey as string] = v
  }
  pick("seller1Name", "owner1name")
  pick("seller1NameLine2", "owner1nameLine2")
  pick("seller1Address", "owner1address")
  pick("seller1Address2", "owner1address2")
  pick("seller1Acn", "owner1acn")
  pick("seller1GstRegistered", "owner1gstRegistered")
  pick("seller1Fax", "owner1fax")
  pick("seller2Name", "owner2name")
  pick("seller2NameLine2", "owner2nameLine2")
  pick("seller2Address", "owner2address")
  pick("seller2Address2", "owner2address2")
  pick("seller2Acn", "owner2acn")
  pick("seller2GstRegistered", "owner2gstRegistered")
  pick("seller2Fax", "owner2fax")
  if (Object.keys(upd).length > 0) {
    await db.update(pandaProperties).set(upd).where(eq(pandaProperties.propertyListId, propertyListId))
  }
}


export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: SendFormsRequestBody
  try {
    body = (await request.json()) as SendFormsRequestBody
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const { propertyFormId, propertyListId, recipientEntityIds, message, prefillValues, saveOnly } = body

  if (!propertyFormId || !propertyListId) {
    return adminJsonError("Missing required fields: propertyFormId, propertyListId", 400)
  }
  if (!saveOnly && (!Array.isArray(recipientEntityIds) || recipientEntityIds.length === 0)) {
    return adminJsonError("recipientEntityIds must be a non-empty array", 400)
  }

  const [form] = await db
    .select({
      propertyFormId: propertyForms.propertyFormId,
      formName: propertyForms.formName,
      fileLink: propertyForms.fileLink,
      googleDriveFileId: propertyForms.googleDriveFileId,
      prefillStrategy: propertyForms.prefillStrategy,
    })
    .from(propertyForms)
    .where(eq(propertyForms.propertyFormId, propertyFormId))
    .limit(1)

  if (!form) return adminJsonError("Form not found", 404)
  if (!form.fileLink) return adminJsonError("Form has no Drive link — upload failed?", 422)

  const [property] = await db
    .select({
      propertyListId: pandaProperties.propertyListId,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!property) return adminJsonError("Property not found", 404)

  // Save-to-Drive-only path: fill PDF, upload to Drive, record audit row, return link — no email sent
  if (saveOnly) {
    if (!form.prefillStrategy || !prefillValues || !form.googleDriveFileId) {
      return adminJsonError("saveOnly requires a form with a prefill strategy and prefillValues", 422)
    }
    try {
      const driveToken = await getDriveAccessToken()
      const { webViewLink, fileName } = await fillAndUploadToDrive(form, property, prefillValues, driveToken)

      await db.insert(propertyFormSends).values({
        propertyFormId: form.propertyFormId,
        propertyListId,
        recipientEmail: null,
        driveFileLink: webViewLink,
        prefillValues: (prefillValues as Record<string, string>) ?? null,
      })

      if (form.prefillStrategy === "form-6") {
        await syncForm6FieldsBack(propertyListId, prefillValues)
      }

      return NextResponse.json({ driveFileLink: webViewLink, driveFileName: fileName }, { status: 201 })
    } catch (err) {
      console.error("[POST /api/admin/property-forms/send] Save-to-Drive failed:", err)
      return adminJsonError("Failed to save PDF to Drive — check Google Drive connection.", 503)
    }
  }

  const recipientRows = await db
    .select({
      entityId: entities.entityId,
      entityName: entities.entityName,
      emailAddress: entities.emailAddress,
    })
    .from(propertyEntities)
    .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
    .where(
      and(
        eq(propertyEntities.propertyListId, propertyListId),
        inArray(entities.entityId, recipientEntityIds),
      ),
    )

  const withEmail = recipientRows.filter((r) => r.emailAddress)
  if (withEmail.length === 0) {
    return adminJsonError("None of the selected recipients have an email address", 422)
  }

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch {
    return adminJsonError(
      "Gmail is not connected. Please reconnect your Google account to enable email sending.",
      503,
    )
  }

  // Generate a pre-filled PDF copy when a prefillStrategy + prefillValues are present
  let emailFileLink = form.fileLink
  let filledDriveLink: string | null = null
  if (prefillValues && form.googleDriveFileId && (form.prefillStrategy === "pro-forma-2026" || form.prefillStrategy === "form-6" || form.prefillStrategy === "contract-sale-purchase-1")) {
    try {
      const driveToken = await getDriveAccessToken()
      const { webViewLink } = await fillAndUploadToDrive(form, property, prefillValues, driveToken)
      emailFileLink = webViewLink
      filledDriveLink = webViewLink
    } catch (err) {
      console.error("[POST /api/admin/property-forms/send] Prefill failed, falling back to master:", err)
      // Fall back to master link so sending still works
    }
  }

  const propertyLabel = [property.streetAddress, property.suburb].filter(Boolean).join(", ")
  const subject = `${form.formName}${propertyLabel ? ` — ${propertyLabel}` : ""}`

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  const bodyHtml = [
    message ? `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : "",
    `<p>Please find the form below:</p>`,
    `<p><a href="${emailFileLink}">${escapeHtml(form.formName)}</a></p>`,
  ]
    .filter(Boolean)
    .join("\n")

  const insertedIds: number[] = []
  const errors: string[] = []

  for (const recipient of withEmail) {
    try {
      await sendGmailMessage(accessToken, recipient.emailAddress!, subject, bodyHtml)

      const [inserted] = await db
        .insert(propertyFormSends)
        .values({
          propertyFormId: form.propertyFormId,
          propertyListId,
          entityId: recipient.entityId,
          recipientEmail: recipient.emailAddress!,
          recipientName: recipient.entityName ?? undefined,
          messageSent: message ?? null,
          driveFileLink: filledDriveLink,
          prefillValues: (prefillValues as Record<string, string>) ?? null,
        })
        .returning({ propertyFormSendId: propertyFormSends.propertyFormSendId })

      insertedIds.push(inserted.propertyFormSendId)
    } catch (err) {
      console.error("[POST /api/admin/property-forms/send] Failed for", recipient.emailAddress, err)
      errors.push(recipient.emailAddress!)
    }
  }

  if (insertedIds.length === 0) {
    return adminJsonError("Failed to send to any recipients", 502)
  }

  if (form.prefillStrategy === "form-6" && prefillValues) {
    await syncForm6FieldsBack(propertyListId, prefillValues)
  }

  return NextResponse.json(
    { sentCount: insertedIds.length, ids: insertedIds, failedEmails: errors },
    { status: 201 },
  )
}
