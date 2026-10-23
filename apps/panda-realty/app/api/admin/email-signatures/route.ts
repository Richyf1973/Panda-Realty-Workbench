import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { createEmailSignature, listEmailSignatures, validateEmailSignatureInput } from "@/lib/email-signatures"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const items = await listEmailSignatures()
  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const parsed = validateEmailSignatureInput(body)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed.", errors: parsed.errors },
      { status: 400 },
    )
  }

  const created = await createEmailSignature(parsed.value)
  return NextResponse.json(created, { status: 200 })
}
