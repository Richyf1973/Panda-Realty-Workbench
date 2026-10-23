import "server-only"

import { NextResponse } from "next/server"
import { and, desc, eq, ilike, inArray, isNotNull, or } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties, pandaSuburbs, entities, propertyEntities, buyerOffers, offerFormSubmissions } from "@/db/schema"
import { CONTACT_CATEGORY_SOLICITOR, ENTITY_CATEGORY_BUYER, ENTITY_CATEGORY_CONTACT } from "@/lib/admin/entity-category-ids"
import { extractAddressSuffixCandidates, extractSuburbFromAddress } from "@/lib/parse-street-address"

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

export async function getContractSalePurchasePrefill(propertyListId: number) {
  const [property] = await db
    .select({
      owner1name: pandaProperties.owner1name,
      owner1address: pandaProperties.owner1address,
      owner1phone: pandaProperties.owner1phone,
      owner1email: pandaProperties.owner1email,
      owner1mobile: pandaProperties.owner1mobile,
      owner1abn: pandaProperties.owner1abn,
      owner2name: pandaProperties.owner2name,
      owner2address: pandaProperties.owner2address,
      owner2phone: pandaProperties.owner2phone,
      owner2email: pandaProperties.owner2email,
      owner2mobile: pandaProperties.owner2mobile,
      owner2abn: pandaProperties.owner2abn,
      streetAddress: pandaProperties.streetAddress,
      suburb: pandaProperties.suburb,
      state: pandaProperties.state,
      postcode: pandaProperties.postcode,
      rpd: pandaProperties.rpd,
      salePrice: pandaProperties.salePrice,
    })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  const addressesToParse = [property?.owner1address, property?.owner2address].filter(Boolean) as string[]
  const suburbCandidates = [...new Set(addressesToParse.flatMap(extractAddressSuffixCandidates))]
  const allSuburbs = suburbCandidates.length > 0
    ? await db
        .select({ suburb: pandaSuburbs.suburb, state: pandaSuburbs.state })
        .from(pandaSuburbs)
        .where(or(...suburbCandidates.map((c) => ilike(pandaSuburbs.suburb, c))))
    : []

  const match1 = property?.owner1address ? extractSuburbFromAddress(property.owner1address, allSuburbs) : null
  const match2 = property?.owner2address ? extractSuburbFromAddress(property.owner2address, allSuburbs) : null

  const uniqueMatchedSuburbs = [...new Set([match1, match2].flatMap((m) => (m ? [m.suburb] : [])))]
  const postcodeMap = new Map<string, string>()
  if (uniqueMatchedSuburbs.length > 0) {
    const postcodeRows = await db
      .selectDistinct({ suburb: pandaProperties.suburb, postcode: pandaProperties.postcode })
      .from(pandaProperties)
      .where(inArray(pandaProperties.suburb, uniqueMatchedSuburbs))
    for (const row of postcodeRows) {
      if (row.suburb && row.postcode) postcodeMap.set(row.suburb.toUpperCase(), row.postcode)
    }
  }

  const propertyFallback = {
    suburb: property?.suburb ?? "",
    state: property?.state ?? "",
    postcode: property?.postcode ?? "",
  }

  function resolveLocation(match: { suburb: string; state: string } | null) {
    if (!match) return propertyFallback
    const postcode = postcodeMap.get(match.suburb.toUpperCase()) ?? propertyFallback.postcode
    return { suburb: match.suburb, state: match.state, postcode }
  }

  const sellers: Array<{
    entityName: string | null; address: string | null; suburb: string; state: string; postcode: string
    phoneNumber: string | null; mobile: string | null; emailAddress: string | null; abn: string | null
  }> = []

  if (property?.owner1name) {
    sellers.push({
      entityName: property.owner1name,
      address: property.owner1address ?? null,
      ...resolveLocation(match1),
      phoneNumber: property.owner1phone ?? null,
      mobile: property.owner1mobile ?? null,
      emailAddress: property.owner1email ?? null,
      abn: property.owner1abn ?? null,
    })
  }
  if (property?.owner2name) {
    sellers.push({
      entityName: property.owner2name,
      address: property.owner2address ?? null,
      ...resolveLocation(match2),
      phoneNumber: property.owner2phone ?? null,
      mobile: property.owner2mobile ?? null,
      emailAddress: property.owner2email ?? null,
      abn: property.owner2abn ?? null,
    })
  }

  const entityRows = property
    ? await db
        .select({
          entityId: entities.entityId,
          entityName: entities.entityName,
          address: entities.address,
          contact: entities.contact,
          emailAddress: entities.emailAddress,
          suburb: entities.esuburb,
          state: entities.estate,
          postcode: entities.epostcode,
          entityCategoryId: entities.entityCategoryId,
          contactCategoryId: entities.contactCategoryId,
          association: entities.association,
        })
        .from(propertyEntities)
        .innerJoin(entities, eq(propertyEntities.entityId, entities.entityId))
        .where(eq(propertyEntities.propertyListId, propertyListId))
    : []

  const buyerRows = entityRows.filter((r) => r.entityCategoryId === ENTITY_CATEGORY_BUYER)
  const buyers = buyerRows.map(({ entityId, entityName, address, contact, emailAddress, suburb, state, postcode }) => ({
    entityId,
    entityName,
    address,
    suburb,
    state,
    postcode,
    phoneNumber: contact?.trim() || null,
    mobile: null as string | null,
    emailAddress,
    abn: null as string | null,
  }))

  // Seller's solicitor only: a property can hold both buyer's and seller's solicitor under the same
  // Solicitor category, distinguished by entities.association. The buyer's solicitor is sourced
  // separately from the offer submission below.
  const sellerSolicitorRow = entityRows.find(
    (r) =>
      r.entityCategoryId === ENTITY_CATEGORY_CONTACT &&
      r.contactCategoryId === CONTACT_CATEGORY_SOLICITOR &&
      r.association?.toLowerCase() === "seller",
  )
  const sellerSolicitor = sellerSolicitorRow
    ? {
        entityName: sellerSolicitorRow.entityName,
        ref: null as string | null,
        address: sellerSolicitorRow.address,
        suburb: sellerSolicitorRow.suburb,
        state: sellerSolicitorRow.state,
        postcode: sellerSolicitorRow.postcode,
        phoneNumber: sellerSolicitorRow.contact?.trim() || null,
        emailAddress: sellerSolicitorRow.emailAddress,
      }
    : null

  const { lot: propertyLot, plan: propertyPlan } = parseRpd(property?.rpd ?? null)

  const acceptedOfferRows = property
    ? await db
        .select({
          propertyEntityId: buyerOffers.propertyEntityId,
          settlementDate: buyerOffers.settlementDate,
          settlementPeriod: buyerOffers.settlementPeriod,
          depositInitial: buyerOffers.depositInitial,
          depositBalance: buyerOffers.depositBalance,
          financeDays: buyerOffers.financeDays,
          buildingPestDays: buyerOffers.buildingPestDays,
          isCashOffer: buyerOffers.isCashOffer,
          isSubjectToFinance: buyerOffers.isSubjectToFinance,
          isSubjectToSale: buyerOffers.isSubjectToSale,
          subjectToSaleAddress: buyerOffers.subjectToSaleAddress,
          financeBank: buyerOffers.financeBank,
          conditionNotes: buyerOffers.conditionNotes,
          coolingOffDays: buyerOffers.coolingOffDays,
        })
        .from(buyerOffers)
        .innerJoin(propertyEntities, eq(buyerOffers.propertyEntityId, propertyEntities.propertyEntityId))
        .where(and(
          eq(propertyEntities.propertyListId, propertyListId),
          eq(buyerOffers.isAccepted, true),
        ))
        .orderBy(buyerOffers.buyerOfferId)
        .limit(1)
    : []

  const offer = acceptedOfferRows[0] ?? null

  // Buyer's solicitor comes from the latest non-draft offer form submission for this buyer
  let buyerSolicitor: { entityName: string | null; ref: null; address: string | null; suburb: null; state: null; postcode: null; phoneNumber: string | null; emailAddress: string | null } | null = null
  if (offer?.propertyEntityId) {
    const [submission] = await db
      .select({
        solicitorName: offerFormSubmissions.solicitorName,
        solicitorPhone: offerFormSubmissions.solicitorPhone,
        solicitorAddress: offerFormSubmissions.solicitorAddress,
        solicitorEmail: offerFormSubmissions.solicitorEmail,
      })
      .from(offerFormSubmissions)
      .where(and(
        eq(offerFormSubmissions.propertyEntityId, offer.propertyEntityId),
        isNotNull(offerFormSubmissions.submittedAt),
      ))
      .orderBy(desc(offerFormSubmissions.submittedAt))
      .limit(1)
    if (submission?.solicitorName || submission?.solicitorPhone || submission?.solicitorAddress || submission?.solicitorEmail) {
      buyerSolicitor = {
        entityName: submission.solicitorName ?? null,
        ref: null,
        address: submission.solicitorAddress ?? null,
        suburb: null,
        state: null,
        postcode: null,
        phoneNumber: submission.solicitorPhone ?? null,
        emailAddress: submission.solicitorEmail ?? null,
      }
    }
  }

  return NextResponse.json({
    sellers,
    buyers,
    sellerSolicitor,
    buyerSolicitor,
    propertyStreetAddress: property?.streetAddress ?? null,
    propertySuburb: property?.suburb ?? null,
    propertyState: property?.state ?? null,
    propertyPostcode: property?.postcode ?? null,
    propertyLot,
    propertyPlan,
    propertyTitleReference: null,
    salePrice: property?.salePrice != null ? String(property.salePrice) : null,
    settlementDate: offer?.settlementDate ?? null,
    settlementPeriod: offer?.settlementPeriod ?? null,
    depositInitial: offer?.depositInitial != null ? String(offer.depositInitial) : null,
    depositBalance: offer?.depositBalance != null ? String(offer.depositBalance) : null,
    financeDays: offer?.financeDays ?? null,
    buildingPestDays: offer?.buildingPestDays ?? null,
    isCashOffer: offer?.isCashOffer ?? null,
    isSubjectToFinance: offer?.isSubjectToFinance ?? null,
    isSubjectToSale: offer?.isSubjectToSale ?? null,
    subjectToSaleAddress: offer?.subjectToSaleAddress ?? null,
    financeBank: offer?.financeBank ?? null,
    conditionNotes: offer?.conditionNotes ?? null,
    coolingOffDays: offer?.coolingOffDays ?? null,
  })
}
