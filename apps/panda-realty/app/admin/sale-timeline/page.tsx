import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sale timeline · Admin",
}

type Props = { searchParams: Promise<{ propertyListId?: string }> }

/**
 * Property Sale Timeline, full screen. Opened from a property it shows that property's sale
 * (started on first open with the address and owners filled in); opened on its own it shows
 * every sale with the timeline's own sale picker. The same timeline appears in the property
 * window's Timeline tab.
 */
export default async function SaleTimelinePage({ searchParams }: Props) {
  const { propertyListId } = await searchParams
  const id = Number(propertyListId)
  const src = Number.isInteger(id) && id > 0 ? `/sale-timeline-app?property=${id}` : "/sale-timeline-app"

  return (
    <div className="flex flex-1 flex-col min-h-0" data-testid="sale-timeline-page">
      <div className="flex items-center gap-3 border-b px-4 py-2 text-sm">
        <Link href="/admin/properties" className="text-muted-foreground hover:underline">
          ← Properties
        </Link>
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
