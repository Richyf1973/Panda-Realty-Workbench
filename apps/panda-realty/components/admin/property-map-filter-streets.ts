import type { StreetResult } from "@/lib/geo"

export function encodeStreetFilter(streets: StreetResult[]): string {
  return streets.map((s) => `${s.street}~${s.state}`).join(",")
}

export async function fetchStreetsForPolygon(points: [number, number][]): Promise<StreetResult[]> {
  const polyStr = points.map(([lat, lng]) => `${lat} ${lng}`).join(" ")
  const params = new URLSearchParams({ polygon: polyStr })
  const res = await fetch(`/api/streets?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
  }
  return res.json() as Promise<StreetResult[]>
}
