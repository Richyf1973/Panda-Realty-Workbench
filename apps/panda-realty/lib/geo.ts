export const AU_STATE_ABBR: Record<string, string> = {
  "western australia": "WA",
  "new south wales": "NSW",
  "victoria": "VIC",
  "queensland": "QLD",
  "south australia": "SA",
  "tasmania": "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
}

export function normalizeState(raw: string): string {
  return AU_STATE_ABBR[raw.toLowerCase()] ?? raw
}

export interface StreetResult {
  street: string
  suburb: string
  state: string
  postcode: string
}
