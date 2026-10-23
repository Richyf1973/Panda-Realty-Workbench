import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { portalFileSignRequests } from "@/db/schema"

// Only active in mock/test mode — lets Playwright tests simulate signing completion
// without touching the real Adobe Sign webhook pipeline.
export async function POST(request: Request) {
  if (process.env.ADOBE_SIGN_TEST_MODE !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).agreementId !== "string" ||
    !["SIGNED", "DECLINED"].includes((body as Record<string, unknown>).event as string)
  ) {
    return NextResponse.json(
      { error: 'Body must be { agreementId: string, event: "SIGNED" | "DECLINED" }' },
      { status: 400 },
    )
  }

  const { agreementId, event } = body as { agreementId: string; event: "SIGNED" | "DECLINED" }

  const now = new Date()
  const isSigned = event === "SIGNED"

  const updated = await db
    .update(portalFileSignRequests)
    .set({
      signatureStatus: isSigned ? "signed" : "cancelled",
      signedAt: isSigned ? now : null,
      cancelledAt: isSigned ? null : now,
    })
    .where(eq(portalFileSignRequests.adobeSignAgreementId, agreementId))
    .returning({ id: portalFileSignRequests.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, updatedId: updated[0].id })
}
