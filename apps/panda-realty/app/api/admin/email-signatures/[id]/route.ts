import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { updateEmailSignature, validateEmailSignatureInput } from "@/lib/email-signatures"

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { id: idRaw } = await params
  const id = Number(idRaw)
  if (!Number.isFinite(id) || id <= 0) {
    return adminJsonError("Invalid signature id", 400)
  }

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

  const updated = await updateEmailSignature(id, parsed.value)
  if (!updated) return adminJsonError("Email signature not found", 404)

  return NextResponse.json(updated, { status: 200 })
}
