import "server-only"

import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"

import { getSessionUser } from "@/lib/auth/session"
import { querySellers, SELLERS_PAGE_SIZE } from "@/lib/admin/sellers-query.server"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("q") ?? undefined
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)

  try {
    const { rows, total } = await querySellers(page, SELLERS_PAGE_SIZE, search)
    return NextResponse.json({ items: rows, total })
  } catch (err) {
    console.error("[sellers GET]", err)
    return adminJsonError("Internal server error", 500)
  }
}
