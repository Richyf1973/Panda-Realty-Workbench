import "server-only"

import { NextResponse } from "next/server"

import { runGmailImport } from "@/lib/lead-import/run-gmail-import"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runGmailImport("today")

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: result.code })
  }

  return NextResponse.json(result)
}
