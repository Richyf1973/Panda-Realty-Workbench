import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { getCalendarAccessToken } from "@/lib/google-calendar-client"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await getCalendarAccessToken()
    return NextResponse.json({ connected: true })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
