import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { portalFileSignRequests, portalTokens } from "@/db/schema"
import { getSigningUrl } from "@/lib/adobe-sign-client"

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token, fileId: driveFileId } = await context.params

  const [tokenRow] = await db
    .select({
      portalTokenId: portalTokens.portalTokenId,
      revokedAt: portalTokens.revokedAt,
    })
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)

  if (!tokenRow) return NextResponse.json({ error: "Token not found" }, { status: 404 })
  if (tokenRow.revokedAt) return NextResponse.json({ error: "Token revoked" }, { status: 403 })

  const [signRow] = await db
    .select({ adobeSignAgreementId: portalFileSignRequests.adobeSignAgreementId })
    .from(portalFileSignRequests)
    .where(
      and(
        eq(portalFileSignRequests.portalTokenId, tokenRow.portalTokenId),
        eq(portalFileSignRequests.fileId, driveFileId),
        eq(portalFileSignRequests.signatureStatus, "pending"),
      ),
    )
    .orderBy(desc(portalFileSignRequests.id))
    .limit(1)

  if (!signRow) {
    return NextResponse.json({ error: "No pending sign request found" }, { status: 404 })
  }

  try {
    const url = await getSigningUrl(signRow.adobeSignAgreementId)
    return NextResponse.json({ url })
  } catch (err) {
    console.error("[portal sign-url]", err)
    return NextResponse.json({ error: "Failed to retrieve signing URL" }, { status: 502 })
  }
}
