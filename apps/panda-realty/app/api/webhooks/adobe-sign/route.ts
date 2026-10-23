import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/db"
import {
  pandaProperties,
  portalFileSignRequests,
  portalTokens,
  propertyEntityFiles,
  propertyListFiles,
} from "@/db/schema"
import { downloadSignedDocument } from "@/lib/adobe-sign-client"
import { buildPropertyFolderName } from "@/lib/build-property-folder-name"
import {
  getDriveAccessToken,
  getOrCreateDriveFolder,
  uploadFileToDrive,
} from "@/lib/google-drive-client"
import { PANDA_DRIVE_PARENT_FOLDER_ID } from "@/lib/panda-drive-constants"

// Adobe Sign webhook security:
//   1. x-adobesign-clientid = "EchoSign2" is Adobe Sign's platform identifier — it is
//      publicly known and NOT a shared secret. It is kept as a secondary sanity check only.
//   2. Real authentication uses an unguessable token in the registered webhook URL as a
//      query param: ?token=<ADOBE_SIGN_WEBHOOK_TOKEN>. ADOBE_SIGN_WEBHOOK_TOKEN must be set
//      in env — the endpoint returns 500 if it is missing (fail-closed, never fail-open).
//   3. Adobe Sign does not support HMAC request signatures or custom request headers, so the
//      URL-token pattern is the correct hardening approach for this platform.
//   URL logging note: the ?token= value will appear in CDN/proxy access logs because Adobe
//   Sign embeds it in the request URL (custom headers are not available). Scrub this query
//   param from access logs at the infrastructure layer and rotate the token if logs are exposed.
const EXPECTED_CLIENT_ID = "EchoSign2"

const webhookBodySchema = z.object({
  event: z.string(),
  agreement: z.object({ id: z.string() }),
})

// Adobe Sign sends GET to verify the webhook URL during registration.
// Must respond with 200 and echo the client ID in the JSON body.
export async function GET(request: Request) {
  const clientId = request.headers.get("x-adobesign-clientid")
  if (!clientId) {
    return NextResponse.json({ error: "Missing x-adobesign-clientid header" }, { status: 400 })
  }
  return NextResponse.json({ xAdobeSignClientId: clientId })
}

export async function POST(request: Request) {
  // Primary auth: unguessable URL token from env must match ?token= in the registered webhook URL.
  const expectedToken = process.env.ADOBE_SIGN_WEBHOOK_TOKEN
  if (!expectedToken) {
    return NextResponse.json({ error: "Server misconfiguration: ADOBE_SIGN_WEBHOOK_TOKEN is not set" }, { status: 500 })
  }
  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? ""
  const expectedHash = createHash("sha256").update(expectedToken).digest()
  const tokenHash = createHash("sha256").update(token).digest()
  if (!timingSafeEqual(expectedHash, tokenHash)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Secondary sanity check: Adobe Sign platform identifier.
  const clientId = request.headers.get("x-adobesign-clientid")
  if (clientId !== EXPECTED_CLIENT_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = webhookBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing required fields: event, agreement.id" }, { status: 400 })
  }

  const { event, agreement } = parsed.data
  const agreementId = agreement.id

  const isSigned = event === "AGREEMENT_ACTION_COMPLETED"
  const isCancelled = event === "AGREEMENT_ACTION_DECLINED" || event === "AGREEMENT_RECALLED"

  if (!isSigned && !isCancelled) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date()
  const updated = await db
    .update(portalFileSignRequests)
    .set({
      signatureStatus: isSigned ? "signed" : "cancelled",
      signedAt: isSigned ? now : null,
      cancelledAt: isSigned ? null : now,
    })
    .where(eq(portalFileSignRequests.adobeSignAgreementId, agreementId))
    .returning({
      id: portalFileSignRequests.id,
      portalTokenId: portalFileSignRequests.portalTokenId,
      fileId: portalFileSignRequests.fileId,
    })

  if (updated.length > 0 && isSigned) {
    await uploadSignedPdfToDrive(agreementId, updated[0].portalTokenId, updated[0].fileId)
  }

  return NextResponse.json({ ok: true })
}

async function uploadSignedPdfToDrive(
  agreementId: string,
  portalTokenId: number,
  fileId: string,
): Promise<void> {
  try {
    const [token] = await db
      .select({
        propertyListId: portalTokens.propertyListId,
        propertyEntityId: portalTokens.propertyEntityId,
      })
      .from(portalTokens)
      .where(eq(portalTokens.portalTokenId, portalTokenId))
      .limit(1)

    if (!token) return

    // Parallelise independent queries: property address + file name lookup
    const [propResults, listFileResults] = await Promise.all([
      db
        .select({
          streetAddress: pandaProperties.streetAddress,
          suburb: pandaProperties.suburb,
          state: pandaProperties.state,
          postcode: pandaProperties.postcode,
        })
        .from(pandaProperties)
        .where(eq(pandaProperties.propertyListId, token.propertyListId))
        .limit(1),
      db
        .select({ fileName: propertyListFiles.fileName })
        .from(propertyListFiles)
        .where(eq(propertyListFiles.googleDriveFileId, fileId))
        .limit(1),
    ])

    const prop = propResults[0]
    if (!prop) return

    let fileName: string | null = listFileResults[0]?.fileName ?? null

    if (!fileName && token.propertyEntityId != null) {
      const [entityFile] = await db
        .select({ fileName: propertyEntityFiles.fileName })
        .from(propertyEntityFiles)
        .where(eq(propertyEntityFiles.googleDriveFileId, fileId))
        .limit(1)
      if (entityFile?.fileName) fileName = entityFile.fileName
    }

    const base = fileName ? fileName.replace(/\.[^.]+$/, "") : "document"
    const signedFileName = `${base}_signed.pdf`

    const pdfBuffer = await downloadSignedDocument(agreementId)
    const accessToken = await getDriveAccessToken()
    const folderName = buildPropertyFolderName(prop.streetAddress, prop.suburb, prop.state, prop.postcode)
    const folderId = await getOrCreateDriveFolder(accessToken, folderName, PANDA_DRIVE_PARENT_FOLDER_ID)

    await uploadFileToDrive(accessToken, pdfBuffer, signedFileName, "application/pdf", folderId)
  } catch (err) {
    console.error("[adobe-sign-webhook] Drive upload failed:", err instanceof Error ? err.message : String(err))
  }
}
