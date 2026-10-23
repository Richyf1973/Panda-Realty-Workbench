import { and, asc, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { portalMessages, portalTokens } from "@/db/schema"
import { sendPortalMessageNotification } from "@/lib/portal-notifications"

const MAX_BODY_LENGTH = 2000

type RouteContext = { params: Promise<{ token: string }> }

async function resolveToken(token: string) {
  const [row] = await db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)
  return row ?? null
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params

  try {
    const tokenRow = await resolveToken(token)
    if (!tokenRow) return NextResponse.json({ error: "Token not found" }, { status: 404 })
    if (tokenRow.revokedAt) return NextResponse.json({ error: "Token revoked" }, { status: 410 })

    const messages = await db
      .select()
      .from(portalMessages)
      .where(eq(portalMessages.portalTokenId, tokenRow.portalTokenId))
      .orderBy(asc(portalMessages.sentAt))

    // Mark unread agent messages as read
    const hasUnreadAgent = messages.some((m) => m.senderRole === "agent" && !m.readAt)

    if (hasUnreadAgent) {
      const now = new Date()
      await db
        .update(portalMessages)
        .set({ readAt: now })
        .where(
          and(
            eq(portalMessages.portalTokenId, tokenRow.portalTokenId),
            isNull(portalMessages.readAt),
            eq(portalMessages.senderRole, "agent"),
          ),
        )
      // Patch in-memory records so the response reflects the update immediately
      for (const m of messages) {
        if (m.senderRole === "agent" && !m.readAt) m.readAt = now
      }
    }

    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[portal/messages GET]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params

  try {
    const tokenRow = await resolveToken(token)
    if (!tokenRow) return NextResponse.json({ error: "Token not found" }, { status: 404 })
    if (tokenRow.revokedAt) return NextResponse.json({ error: "Token revoked" }, { status: 410 })

    const body = await request.json().catch(() => null)
    const messageBody = typeof body?.body === "string" ? body.body.trim() : ""

    if (!messageBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 })
    }
    if (messageBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_BODY_LENGTH} chars)` }, { status: 400 })
    }

    const [inserted] = await db
      .insert(portalMessages)
      .values({
        portalTokenId: tokenRow.portalTokenId,
        senderRole: "client",
        body: messageBody,
      })
      .returning()

    // Fire-and-forget — do not block the response
    void sendPortalMessageNotification(tokenRow, messageBody, new URL(request.url).origin).catch((err) => {
      console.error("[portal/messages POST] notification failed", err)
    })

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[portal/messages POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
