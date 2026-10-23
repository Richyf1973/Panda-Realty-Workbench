import type { Metadata } from "next"
import Link from "next/link"
import { eq } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties } from "@/db/schema"

export const metadata: Metadata = {
  title: "Sale timeline · Admin",
}

export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ propertyListId?: string }> }

/**
 * Property Sale Timeline. Opened from a property row it shows that property's sale
 * (created on first open with the address and owners filled in); opened on its own it
 * shows every sale with the timeline's own sale picker.
 */
export default async function SaleTimelinePage({ searchParams }: Props) {
  const { propertyListId } = await searchParams
  const id = Number(propertyListId)
  let src = "/sale-timeline-app"
  let heading = "Sale timeline"

  if (Number.isInteger(id) && id > 0) {
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
      .where(eq(pandaProperties.propertyListId, id))
      .limit(1)

    if (p) {
      const address = [p.streetAddress, p.suburb, [p.state, p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      const vendor = [p.owner1name, p.owner2name].filter(Boolean).join(" & ") || "Vendor"
      const qs = new URLSearchParams({ sale: `property-${id}`, property: String(id), address, vendor, email: p.owner1email ?? "" })
      src = `/sale-timeline-app?${qs.toString()}`
      heading = address
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0" data-testid="sale-timeline-page">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2 text-sm">
        <Link href="/admin/properties" className="text-muted-foreground hover:underline">
          ← Properties
        </Link>
        <span className="truncate font-medium">{heading}</span>
      </div>
      <iframe
        title="Property sale timeline"
        src={src}
        className="w-full flex-1 border-0"
        style={{ minHeight: "calc(100vh - 7rem)" }}
      />
    </div>
  )
}
