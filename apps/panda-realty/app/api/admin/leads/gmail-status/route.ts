import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { isGmailConnected } from "@/lib/gmail-client"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const connected = await isGmailConnected()
  return NextResponse.json({ connected })
}
