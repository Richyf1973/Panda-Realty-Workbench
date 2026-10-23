import "server-only"

import { NextResponse } from "next/server"
import { z } from "zod"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { runGmailImport } from "@/lib/lead-import/run-gmail-import"

const DATE_RANGE_VALUES = ["today", "yesterday", "this-week", "last-30", "last-60"] as const

const requestBodySchema = z.object({
  dateRange: z.enum(DATE_RANGE_VALUES),
})

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const parsed = requestBodySchema.safeParse(body)
  if (!parsed.success) {
    return adminJsonError("dateRange is required", 400)
  }

  const result = await runGmailImport(parsed.data.dateRange)

  if (result.status === "error") {
    return adminJsonError(result.message, result.code)
  }

  return NextResponse.json(result)
}
