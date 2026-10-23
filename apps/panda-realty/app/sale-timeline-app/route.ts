import "server-only"

import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth/session"
import { SALE_TIMELINE_SHIM } from "@/lib/sale-timeline/shim"
import { TIMELINE_HTML } from "@/lib/sale-timeline/timeline-html"

/**
 * Serves the Property Sale Timeline page (embedded by /admin/sale-timeline).
 * The storage adapter is injected before the page's own script so its
 * `window.claude.use(...)` calls reach the app's API instead of the artifact store.
 */
export async function GET() {
  if (!(await getSessionUser())) {
    return new NextResponse("Please sign in again.", { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } })
  }
  const html = TIMELINE_HTML.replace("<body>", `<body>${SALE_TIMELINE_SHIM}`)
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-frame-options": "SAMEORIGIN",
    },
  })
}
