import "server-only"

import { and, asc, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { db } from "@/db"
import { portalMessages } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { sendAgentMessageNotification } from "@/lib/portal-notifications"

const MAX_BODY_LENGTH = 2000

type RouteContext = { params: Promise<{ portalTokenId: string }> }

export async function GET(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { portalTokenId } = await context.params
  const tokenId = parseInt(portalTokenId, 10)
  if (isNaN(tokenId)) return adminJsonError("Invalid portalTokenId", 400)

  // Peek mode (?peek=1) returns the thread without marking client messages read.
  // Used to prefetch the unread indicator on dialog open without clearing it.
  const peek = new URL(request.url).searchParams.has("peek")

  try {
    const messages = await db
      .select()
      .from(portalMessages)
      .where(eq(portalMessages.portalTokenId, tokenId))
      .orderBy(asc(portalMessages.sentAt))

    // Mark unread client messages as read (skipped in peek mode)
    const hasUnreadClient = messages.some((m) => m.senderRole === "client" && !m.readAt)
    if (!peek && hasUnreadClient) {
      const now = new Date()
      await db
        .update(portalMessages)
        .set({ readAt: now })
        .where(
          and(
            eq(portalMessages.portalTokenId, tokenId),
            isNull(portalMessages.readAt),
            eq(portalMessages.senderRole, "client"),
          ),
        )
      // Patch in-memory records so the response reflects the update immediately
      for (const m of messages) {
        if (m.senderRole === "client" && !m.readAt) m.readAt = now
      }
    }

    return NextResponse.json({ messages })
  } catch (err) {
    console.error("[admin/portal-messages GET]", err)
    return adminJsonError("Internal server error", 500)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { portalTokenId } = await context.params
  const tokenId = parseInt(portalTokenId, 10)
  if (isNaN(tokenId)) return adminJsonError("Invalid portalTokenId", 400)

  try {
    const body = await request.json().catch(() => null)
    const messageBody = typeof body?.body === "string" ? body.body.trim() : ""

    if (!messageBody) return adminJsonError("Message body is required", 400)
    if (messageBody.length > MAX_BODY_LENGTH) {
      return adminJsonError(`Message too long (max ${MAX_BODY_LENGTH} chars)`, 400)
    }

    const [inserted] = await db
      .insert(portalMessages)
      .values({
        portalTokenId: tokenId,
        senderRole: "agent",
        body: messageBody,
      })
      .returning()

    // Fire-and-forget — notify the client by email; never block or fail the response.
    void sendAgentMessageNotification(tokenId, messageBody, new URL(request.url).origin).catch((err) => {
      console.error("[admin/portal-messages POST] notification failed", err)
    })

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[admin/portal-messages POST]", err)
    return adminJsonError("Internal server error", 500)
  }
}
