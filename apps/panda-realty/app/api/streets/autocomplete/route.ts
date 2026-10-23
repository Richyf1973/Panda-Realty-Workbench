import "server-only"

import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties } from "@/db/schema"

const USER_AGENT = "panda-realty-admin/1.0"
const VIEWBOX_DELTA = 0.5
// Tighter viewbox for the bounded retry — excludes Nambour (0.44°) while keeping Caboolture area
const BOUNDED_DELTA = 0.3

type NominatimPlace = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    hamlet?: string
    postcode?: string
    state?: string
  }
}

/** Distinct (suburb, postcode) pairs from favorited properties. Cached 60 s. */
const getFavoritedData = unstable_cache(
  async () => {
    const rows = await db
      .selectDistinct({ suburb: pandaProperties.suburb, postcode: pandaProperties.postcode })
      .from(pandaProperties)
      .where(eq(pandaProperties.isFavorite, true))
    return rows
  },
  ["autocomplete-favorited-data"],
  { revalidate: 60 },
)

/**
 * Geocode a postcode to get a lat/lng for viewbox bias.
 * Cached for 1 hour — postcode centroids don't change.
 * Uses postcode rather than suburb name to avoid typos in the DB.
 */
const getFavoritedViewboxCenter = unstable_cache(
  async (postcode: string): Promise<{ lat: number; lng: number } | null> => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${postcode} QLD`)}&countrycodes=au&format=json&limit=1`
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
    if (!res.ok) return null
    const data: Array<{ lat: string; lon: string }> = await res.json()
    if (!data[0]) return null
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) }
  },
  ["autocomplete-viewbox-center-v2"],
  { revalidate: 3600 },
)

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ items: [] }, { status: 401 })

  const url = new URL(request.url)
  const q = url.searchParams.get("q")
  if (!q?.trim()) return NextResponse.json({ items: [] })

  const favRows = await getFavoritedData()

  // Build a postcode → suburb map for filtering and display formatting
  const postcodeToSuburb = new Map<string, string>()
  for (const r of favRows) {
    if (r.postcode) postcodeToSuburb.set(r.postcode.trim(), r.suburb.trim())
  }

  // Build a viewbox centered on the first favorited suburb (bias, not strict)
  let viewboxParam = ""
  let viewboxCenter: { lat: number; lng: number } | null = null
  const firstPostcode = favRows.find((r) => r.postcode)?.postcode
  if (firstPostcode) {
    viewboxCenter = await getFavoritedViewboxCenter(firstPostcode)
    if (viewboxCenter) {
      viewboxParam = `&viewbox=${viewboxCenter.lng - VIEWBOX_DELTA},${viewboxCenter.lat + VIEWBOX_DELTA},${viewboxCenter.lng + VIEWBOX_DELTA},${viewboxCenter.lat - VIEWBOX_DELTA}`
    }
  }

  const fetchNominatim = async (extraParams: string): Promise<NominatimPlace[]> => {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=au&format=json&addressdetails=1&limit=20${extraParams}`
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    return res.json()
  }

  const toItems = (data: NominatimPlace[]) =>
    data.map((place) => {
      const postcode = place.address?.postcode?.trim() ?? ""
      const matchedSuburb = postcodeToSuburb.get(postcode)
      let title = place.display_name
      if (matchedSuburb && place.address?.road) {
        const state = place.address.state ?? "QLD"
        title = `${place.address.road}, ${matchedSuburb}, ${state} ${postcode}`
      }
      return { id: String(place.place_id), title, lat: Number(place.lat), lng: Number(place.lon), postcode }
    })

  const filterByPostcode = (candidates: ReturnType<typeof toItems>) =>
    postcodeToSuburb.size === 0
      ? candidates
      : candidates.filter((item) => postcodeToSuburb.has(item.postcode))

  const boundedParam = viewboxCenter
    ? `&viewbox=${viewboxCenter.lng - BOUNDED_DELTA},${viewboxCenter.lat + BOUNDED_DELTA},${viewboxCenter.lng + BOUNDED_DELTA},${viewboxCenter.lat - BOUNDED_DELTA}&bounded=1`
    : ""

  // Call 1: soft viewbox bias (no bounded) — works for full suburb names and specific streets
  const call1Items = toItems(await fetchNominatim(viewboxParam))
  const call1Matched = filterByPostcode(call1Items)

  // Call 2: bounded=1 with tight viewbox — only when Call 1 finds no favorited-suburb matches.
  // Fixes ambiguous single-word queries like "Webster" that Nominatim ranks a distant locality
  // above local streets in the soft-bias pass.
  const call2Items = call1Matched.length === 0 && boundedParam
    ? toItems(await fetchNominatim(boundedParam))
    : []

  // Use whichever call produced favorited matches; fall back to the bounded set if call 1 had none
  const activeItems = call1Matched.length > 0 ? call1Items : call2Items.length > 0 ? call2Items : call1Items

  // Favorited-suburb results first, then everything else from the same result set
  const matched = filterByPostcode(activeItems)
  const unmatched = activeItems.filter((i) => !postcodeToSuburb.has(i.postcode))

  const items = [...matched, ...unmatched].map(({ id, title, lat, lng }) => ({
    id,
    title,
    lat,
    lng,
  }))

  return NextResponse.json({ items })
}
