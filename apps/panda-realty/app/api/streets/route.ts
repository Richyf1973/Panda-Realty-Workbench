import { NextResponse } from "next/server"
import { normalizeState, type StreetResult } from "@/lib/geo"

const USER_AGENT = "panda-realty-admin/1.0"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const polygonParam = url.searchParams.get("polygon")
  const lat = url.searchParams.get("lat")
  const lng = url.searchParams.get("lng")
  const radius = url.searchParams.get("radius")

  if (!polygonParam && (!lat || !lng || !radius)) {
    return NextResponse.json(
      { error: "Provide either polygon or lat/lng/radius" },
      { status: 400 },
    )
  }

  let overpassQuery: string
  let centerLat: number
  let centerLng: number

  if (polygonParam) {
    const pairs = polygonParam.trim().split(/\s+/)
    if (pairs.length < 6 || pairs.length % 2 !== 0) {
      return NextResponse.json(
        { error: "polygon must have at least 3 lat/lng pairs" },
        { status: 400 },
      )
    }
    const coords: [number, number][] = []
    for (let i = 0; i < pairs.length; i += 2) {
      coords.push([parseFloat(pairs[i]), parseFloat(pairs[i + 1])])
    }
    centerLat = coords.reduce((s, c) => s + c[0], 0) / coords.length
    centerLng = coords.reduce((s, c) => s + c[1], 0) / coords.length
    const safePolyStr = coords.map(([lat, lng]) => `${lat} ${lng}`).join(" ")
    overpassQuery = `
      [out:json][timeout:25];
      way(poly:"${safePolyStr}")[highway][name];
      out tags;
    `
  } else {
    const latN = parseFloat(lat!)
    const lngN = parseFloat(lng!)
    const radiusN = Math.round(parseFloat(radius!))
    centerLat = latN
    centerLng = lngN
    overpassQuery = `
      [out:json][timeout:25];
      way(around:${radiusN},${latN},${lngN})[highway][name];
      out tags;
    `
  }

  // Reverse geocode (suburb/state/postcode) and the Overpass street lookup are independent —
  // run them concurrently rather than sequentially so the slower of the two bounds latency.
  const reverseGeocode = async (): Promise<{ suburb: string; state: string; postcode: string }> => {
    const nominatimUrl =
      `https://nominatim.openstreetmap.org/reverse?lat=${centerLat}&lon=${centerLng}&format=json&addressdetails=1`
    const nominatimRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (!nominatimRes.ok) {
      console.warn(
        `[streets] Nominatim reverse geocode failed (${nominatimRes.status}) — suburb/state/postcode will be empty`,
      )
      return { suburb: "", state: "", postcode: "" }
    }
    const nominatimData = await nominatimRes.json()
    const addr = nominatimData.address ?? {}
    return {
      suburb: addr.suburb ?? addr.town ?? addr.village ?? addr.city_district ?? addr.city ?? "",
      state: normalizeState(addr.state ?? ""),
      postcode: addr.postcode ?? "",
    }
  }

  const overpassEndpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ]

  type OverpassData = { elements?: Array<{ tags?: { name?: string } }> }

  const fetchOverpassFrom = async (endpoint: string): Promise<OverpassData> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      throw new Error(`Overpass ${endpoint} returned ${res.status}`)
    }
    return res.json()
  }

  // Race all mirrors and take the fastest successful response. Public Overpass instances vary wildly
  // in load: the old sequential fallback blocked on a slow-but-up endpoint (up to its 30s timeout)
  // before ever trying a faster mirror, which dominated map-search latency once the DB query was fast.
  const fetchOverpass = async (): Promise<OverpassData | null> => {
    try {
      return await Promise.any(overpassEndpoints.map(fetchOverpassFrom))
    } catch (err) {
      console.warn(`[streets] All Overpass endpoints failed:`, err)
      return null
    }
  }

  const startedAt = performance.now()
  const [{ suburb, state, postcode }, overpassData] = await Promise.all([
    reverseGeocode(),
    fetchOverpass(),
  ])
  console.info(
    `[streets] geo lookup ${Math.round(performance.now() - startedAt)}ms ` +
      `(streets: ${overpassData?.elements?.length ?? 0})`,
  )

  if (!overpassData) {
    return NextResponse.json(
      { error: "All Overpass endpoints failed. Try again in a moment." },
      { status: 502 },
    )
  }

  const seen = new Set<string>()
  const results: StreetResult[] = []

  for (const element of overpassData.elements ?? []) {
    const street = element.tags?.name as string | undefined
    if (!street) continue
    if (seen.has(street)) continue
    seen.add(street)
    results.push({ street, suburb, state, postcode })
  }

  results.sort((a, b) => a.street.localeCompare(b.street))

  return NextResponse.json(results)
}
