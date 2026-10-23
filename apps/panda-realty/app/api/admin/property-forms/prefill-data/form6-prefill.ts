import "server-only"

import { NextResponse } from "next/server"
import { eq, ilike, or } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties, pandaSuburbs } from "@/db/schema"
import { extractAddressSuffixCandidates, extractSuburbFromAddress } from "@/lib/parse-street-address"

function extractPostcodeFromAddress(address: string): string | null {
  const matches = address.match(/\b(\d{4})\b/g)
  return matches ? matches[matches.length - 1] : null
}

function parseRpd(rpd: string | null): { lot: string; plan: string } {
  if (!rpd) return { lot: "", plan: "" }
  if (rpd.includes("/")) {
    const idx = rpd.indexOf("/")
    return { lot: rpd.slice(0, idx).trim(), plan: rpd.slice(idx + 1).trim() }
  }
  const lMatch = rpd.match(/^L(\d+)\s+(.+)$/)
  if (lMatch) return { lot: lMatch[1], plan: lMatch[2].trim() }
  return { lot: "", plan: rpd.trim() }
}

export async function getForm6Prefill(propertyListId: number) {
  const [property] = await db
    .select({
      owner1name: pandaProperties.owner1name,
      owner1address: pandaProperties.owner1address,
      owner1phone: pandaProperties.owner1phone,
      owner1email: pandaProperties.owner1email,
      owner1mobile: pandaProperties.owner1mobile,
      owner1abn: pandaProperties.owner1abn,
      owner1nameLine2: pandaProperties.owner1nameLine2,
      owner1acn: pandaProperties.owner1acn,
      owner1gstRegistered: pandaProperties.owner1gstRegistered,
      owner1address2: pandaProperties.owner1address2,
      owner1fax: pandaProperties.owner1fax,
      owner2name: pandaProperties.owner2name,
      owner2address: pandaProperties.owner2address,
      owner2phone: pandaProperties.owner2phone,
      owner2email: pandaProperties.owner2email,
      owner2mobile: pandaProperties.owner2mobile,
      owner2abn: pandaProperties.owner2abn,
      owner2nameLine2: pandaProperties.owner2nameLine2,
      owner2acn: pandaProperties.owner2acn,
      owner2gstRegistered: pandaProperties.owner2gstRegistered,
      owner2address2: pandaProperties.owner2address2,
      owner2fax: pandaProperties.owner2fax,
      owner3name: pandaProperties.owner3name,
      owner3address: pandaProperties.owner3address,
      owner3phone: pandaProperties.owner3phone,
      owner3email: pandaProperties.owner3email,
      owner3mobile: pandaProperties.owner3mobile,
      owner3abn: pandaProperties.owner3abn,
      owner3nameLine2: pandaProperties.owner3nameLine2,
      owner3acn: pandaProperties.owner3acn,
      owner3gstRegistered: pandaProperties.owner3gstRegistered,
      owner3address2: pandaProperties.owner3address2,
      owner3fax: pandaProperties.owner3fax,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
      rpd: pandaProperties.rpd,
      propertyType: pandaProperties.propertyType,
      commissionRate: pandaProperties.commissionRate,
      appraisedAmount: pandaProperties.appraisedAmount,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 })

  const addressesToParse = [property.owner1address, property.owner2address, property.owner3address].filter(Boolean) as string[]
  const suburbCandidates = [...new Set(addressesToParse.flatMap(extractAddressSuffixCandidates))]
  const allSuburbs = suburbCandidates.length > 0
    ? await db
        .select({ suburb: pandaSuburbs.suburb, state: pandaSuburbs.state })
        .from(pandaSuburbs)
        .where(or(...suburbCandidates.map((c) => ilike(pandaSuburbs.suburb, c))))
    : []

  const match1 = property.owner1address ? extractSuburbFromAddress(property.owner1address, allSuburbs) : null
  const match2 = property.owner2address ? extractSuburbFromAddress(property.owner2address, allSuburbs) : null
  const match3 = property.owner3address ? extractSuburbFromAddress(property.owner3address, allSuburbs) : null

  const sellers = []
  if (property.owner1name) {
    sellers.push({
      entityName: property.owner1name,
      nameLine2: property.owner1nameLine2 ?? null,
      address: property.owner1address ?? null,
      address2: property.owner1address2 ?? null,
      suburb: match1?.suburb ?? null,
      state: match1?.state ?? null,
      postcode: property.owner1address ? extractPostcodeFromAddress(property.owner1address) : null,
      phoneNumber: property.owner1phone ?? null,
      mobile: property.owner1mobile ?? null,
      emailAddress: property.owner1email ?? null,
      abn: property.owner1abn ?? null,
      acn: property.owner1acn ?? null,
      gstRegistered: property.owner1gstRegistered ?? null,
      fax: property.owner1fax ?? null,
    })
  }
  if (property.owner2name) {
    sellers.push({
      entityName: property.owner2name,
      nameLine2: property.owner2nameLine2 ?? null,
      address: property.owner2address ?? null,
      address2: property.owner2address2 ?? null,
      suburb: match2?.suburb ?? null,
      state: match2?.state ?? null,
      postcode: property.owner2address ? extractPostcodeFromAddress(property.owner2address) : null,
      phoneNumber: property.owner2phone ?? null,
      mobile: property.owner2mobile ?? null,
      emailAddress: property.owner2email ?? null,
      abn: property.owner2abn ?? null,
      acn: property.owner2acn ?? null,
      gstRegistered: property.owner2gstRegistered ?? null,
      fax: property.owner2fax ?? null,
    })
  }
  if (property.owner3name) {
    sellers.push({
      entityName: property.owner3name,
      nameLine2: property.owner3nameLine2 ?? null,
      address: property.owner3address ?? null,
      address2: property.owner3address2 ?? null,
      suburb: match3?.suburb ?? null,
      state: match3?.state ?? null,
      postcode: property.owner3address ? extractPostcodeFromAddress(property.owner3address) : null,
      phoneNumber: property.owner3phone ?? null,
      mobile: property.owner3mobile ?? null,
      emailAddress: property.owner3email ?? null,
      abn: property.owner3abn ?? null,
      acn: property.owner3acn ?? null,
      gstRegistered: property.owner3gstRegistered ?? null,
      fax: property.owner3fax ?? null,
    })
  }

  const { lot: propertyLot, plan: propertyPlan } = parseRpd(property.rpd ?? null)

  const propertyDescription1 = property.propertyType ? `Sale of ${property.propertyType}` : null

  return NextResponse.json({
    sellers,
    propertyDescription1,
    propertyStreetAddress: property.streetAddress ?? null,
    propertySuburb: property.suburb ?? null,
    propertyState: property.state ?? null,
    propertyPostcode: property.postcode ?? null,
    propertyLot,
    propertyPlan,
    propertyTitleReference: null,
    commissionRate: property.commissionRate ?? null,
    appraisedAmount: property.appraisedAmount != null ? String(property.appraisedAmount) : null,
  })
}
