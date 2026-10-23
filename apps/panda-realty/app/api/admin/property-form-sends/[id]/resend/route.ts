import "server-only"

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties, propertyFormSends, propertyForms } from "@/db/schema"
import { getGmailAccessToken, sendGmailMessage } from "@/lib/gmail-client"

interface ResendBody {
  emails: string[]
  message?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id } = await params
  const sendId = Number(id)
  if (!Number.isFinite(sendId) || sendId <= 0) return adminJsonError("Invalid id", 400)

  let body: ResendBody
  try {
    body = (await request.json()) as ResendBody
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }
  const { emails, message } = body
  if (!Array.isArray(emails) || emails.length === 0) {
    return adminJsonError("emails must be a non-empty array", 400)
  }
  const validEmails = emails.filter((e) => typeof e === "string" && e.includes("@"))
  if (validEmails.length === 0) return adminJsonError("No valid email addresses provided", 400)

  const [sendRow] = await db
    .select({
      driveFileLink: propertyFormSends.driveFileLink,
      propertyFormId: propertyFormSends.propertyFormId,
      propertyListId: propertyFormSends.propertyListId,
    })
    .from(propertyFormSends)
    .where(eq(propertyFormSends.propertyFormSendId, sendId))
    .limit(1)

  if (!sendRow) return adminJsonError("Send record not found", 404)
  if (!sendRow.driveFileLink) return adminJsonError("No Drive file link on this send record", 422)

  const [form] = await db
    .select({ formName: propertyForms.formName })
    .from(propertyForms)
    .where(eq(propertyForms.propertyFormId, sendRow.propertyFormId))
    .limit(1)

  const [property] = await db
    .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, sendRow.propertyListId))
    .limit(1)

  let accessToken: string
  try {
    accessToken = await getGmailAccessToken()
  } catch {
    return adminJsonError(
      "Gmail is not connected. Please reconnect your Google account to enable email sending.",
      503,
    )
  }

  const formName = form?.formName ?? "Form"
  const propertyLabel = [property?.streetAddress, property?.suburb].filter(Boolean).join(", ")
  const subject = `${formName}${propertyLabel ? ` — ${propertyLabel}` : ""}`

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  const bodyHtml = [
    message ? `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : "",
    `<p>Please find the form below:</p>`,
    `<p><a href="${sendRow.driveFileLink}">${escapeHtml(formName)}</a></p>`,
  ]
    .filter(Boolean)
    .join("\n")

  const errors: string[] = []
  for (const email of validEmails) {
    try {
      await sendGmailMessage(accessToken, email, subject, bodyHtml)
    } catch {
      errors.push(email)
    }
  }

  const sentCount = validEmails.length - errors.length
  if (sentCount === 0) return adminJsonError("Failed to send to any recipients", 502)

  return NextResponse.json({ sentCount, failedEmails: errors }, { status: 200 })
}
