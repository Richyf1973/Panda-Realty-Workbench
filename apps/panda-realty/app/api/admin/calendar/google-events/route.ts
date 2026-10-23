import { differenceInCalendarDays } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { getGmailAccessToken } from "@/lib/gmail-client"
import { listCalendarEvents } from "@/lib/google-calendar-client"

/** Max inclusive calendar span for `from`/`to` (exclusive end) — abuse guard. */
const MAX_RANGE_DAYS = 124

function parseIsoDate(s: string): Date | null {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const month = searchParams.get("month") // YYYY-MM — legacy

  let timeMin: Date
  let timeMax: Date

  const hasFrom = Boolean(fromParam)
  const hasTo = Boolean(toParam)
  if (hasFrom !== hasTo) {
    return NextResponse.json({ error: "from and to must both be supplied" }, { status: 400 })
  }

  if (fromParam != null && toParam != null) {
    const from = parseIsoDate(fromParam)
    const to = parseIsoDate(toParam)
    if (!from || !to) {
      return NextResponse.json({ error: "Invalid from or to" }, { status: 400 })
    }
    if (from.getTime() >= to.getTime()) {
      return NextResponse.json({ error: "from must be before to" }, { status: 400 })
    }
    const spanDays = differenceInCalendarDays(to, from)
    if (spanDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Range must be at most ${MAX_RANGE_DAYS} days` },
        { status: 400 },
      )
    }
    timeMin = from
    timeMax = to
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split("-").map(Number) as [number, number]
    timeMin = new Date(Date.UTC(year, mon - 1, 1))
    timeMax = new Date(Date.UTC(year, mon, 1))
  } else {
    const now = new Date()
    timeMin = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    timeMax = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  }

  try {
    const token = await getGmailAccessToken()
    const events = await listCalendarEvents(token, timeMin, timeMax)
    return NextResponse.json({ connected: true, events })
  } catch (err) {
    // getGmailAccessToken throws when not connected — treat as disconnected
    const isNotConnected =
      err instanceof Error && err.message.toLowerCase().includes("not connected")
    if (isNotConnected) return NextResponse.json({ connected: false, events: [] })
    return NextResponse.json({ connected: true, events: [], error: "fetch_failed" })
  }
}
