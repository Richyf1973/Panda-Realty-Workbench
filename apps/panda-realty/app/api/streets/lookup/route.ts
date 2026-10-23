import { NextResponse } from "next/server"

const USER_AGENT = "panda-realty-admin/1.0"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const detailsUrl =
    `https://nominatim.openstreetmap.org/details?place_id=${encodeURIComponent(id)}&format=json`

  const res = await fetch(detailsUrl, {
    headers: { "User-Agent": USER_AGENT },
  })
  if (!res.ok) return NextResponse.json({ error: `Nominatim error ${res.status}` }, { status: 502 })

  const data = await res.json()
  const centroid = data.centroid?.coordinates // [lng, lat]
  if (!centroid) return NextResponse.json({ position: null })

  return NextResponse.json({ position: { lat: centroid[1], lng: centroid[0] } })
}
