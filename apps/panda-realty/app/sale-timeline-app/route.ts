import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { SALE_TIMELINE_SHIM } from "@/lib/sale-timeline/shim"
import { TIMELINE_HTML } from "@/lib/sale-timeline/timeline-html"

/**
 * Serves the Property Sale Timeline page (embedded by the property window's Timeline tab
 * and by /admin/sale-timeline).
 *
 * `?property=<property_list_id>` opens that property's sale: the request is redirected once
 * with the sale id ("property-<id>"), address, owners and owner email filled in, which the
 * timeline uses to start the sale the first time it is opened.
 *
 * The storage adapter is injected before the page's own script so its
 * `window.claude.use(...)` calls reach the app's API instead of the artifact store.
 */
export async function GET(request: Request) {
  if (!(await getSessionUser())) {
    return new NextResponse("Please sign in again.", { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } })
  }

  const url = new URL(request.url)
  const property = Number(url.searchParams.get("property"))
  if (Number.isInteger(property) && property > 0 && !url.searchParams.get("sale")) {
    const [p] = await db
      .select({
        streetAddress: pandaProperties.streetAddress,
        suburb: pandaProperties.suburb,
        state: pandaProperties.state,
        postcode: pandaProperties.postcode,
        owner1name: pandaProperties.owner1name,
        owner1email: pandaProperties.owner1email,
        owner2name: pandaProperties.owner2name,
      })
      .from(pandaProperties)
      .where(eq(pandaProperties.propertyListId, property))
      .limit(1)
    if (!p) return new NextResponse("Property not found.", { status: 404 })
    const address = [p.streetAddress, p.suburb, [p.state, p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ")
    const next = new URL("/sale-timeline-app", url)
    next.search = new URLSearchParams({
      sale: `property-${property}`,
      property: String(property),
      address,
      vendor: [p.owner1name, p.owner2name].filter(Boolean).join(" & ") || "Vendor",
      email: p.owner1email ?? "",
    }).toString()
    return NextResponse.redirect(next, 302)
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
