"use client"

import { Home, Map as MapIcon } from "lucide-react"

import { buildRealEstateUrl, buildGoogleMapsUrl } from "@/lib/property-external-links"

interface RowLinkEntry {
  href: string | null
  icon: React.ReactNode
  tooltip: string
}

export function buildPropertyRowLinks(
  row: Record<string, unknown>,
  compactRowLinks: boolean | undefined,
  addressConversions: ReadonlyMap<string, string>,
): RowLinkEntry[] {
  const streetAddress = typeof row["streetAddress"] === "string" ? row["streetAddress"] : ""
  const suburb = typeof row["suburb"] === "string" ? row["suburb"] : ""
  const state = typeof row["state"] === "string" ? row["state"] : ""
  const postcode = typeof row["postcode"] === "string" ? row["postcode"] : ""
  const openInRpp = typeof row["openInRpp"] === "string" ? row["openInRpp"] : null

  const realEstateHref = buildRealEstateUrl(streetAddress, suburb, state, postcode, addressConversions)
  const googleMapsHref = buildGoogleMapsUrl(streetAddress, suburb, state, postcode)

  const iconHome = <Home className={compactRowLinks ? "h-3 w-3" : "h-3.5 w-3.5"} />
  const iconMap = <MapIcon className={compactRowLinks ? "h-3 w-3" : "h-3.5 w-3.5"} />

  const corelogic: RowLinkEntry = {
    href: openInRpp || null,
    icon: (
      <span className={compactRowLinks ? "text-[0.65rem] font-bold leading-none" : "text-xs font-bold leading-none"}>
        C
      </span>
    ),
    tooltip: openInRpp ? "Open in Corelogic" : "No Corelogic link",
  }
  const realestate: RowLinkEntry = {
    href: realEstateHref,
    icon: iconHome,
    tooltip: "View on realestate.com.au",
  }
  const maps: RowLinkEntry = {
    href: googleMapsHref,
    icon: iconMap,
    tooltip: "Open in Google Maps",
  }

  if (compactRowLinks && !openInRpp) {
    return [realestate, maps]
  }
  return [corelogic, realestate, maps]
}
