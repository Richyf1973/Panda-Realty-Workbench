export type { Seller, Buyer, SolicitorContact, ProFormaBuyer, Form6ApiData, ContractSpApiData, ProFormaApiData } from "./prefill-types"
export { mapContractSpData } from "./contract-sp-mapper"

import type { Form6ApiData, ProFormaApiData } from "./prefill-types"
import { formatAuPrice } from "@/lib/format-au-price"

function stripSuburbSuffix(address: string | null | undefined, suburb: string | null | undefined): string {
  if (!address) return ""
  if (!suburb) return address
  const idx = address.toLowerCase().lastIndexOf(suburb.toLowerCase())
  if (idx === -1) return address
  return address.slice(0, idx).replace(/[,\s]+$/, "")
}

export function mapForm6Data(
  data: Form6ApiData,
  initialValues: Record<string, string> | undefined,
  propertyAddress: string | undefined,
): Record<string, string> {
  const seller1 = data.sellers[0]
  const seller2 = data.sellers[1]
  const seller3 = data.sellers[2]
  const commissionDisplay = data.commissionRate ? `${parseFloat(data.commissionRate)}%` : ""
  const priceAmount = formatAuPrice(data.appraisedAmount)
  return {
    ...(initialValues ?? {}),
    propertyAddress: propertyAddress ?? "",
    propertyDescription1: data.propertyDescription1 ?? "",
    propertyStreetAddress: data.propertyStreetAddress ?? "",
    propertySuburb: data.propertySuburb ?? "",
    propertyState: data.propertyState ?? "",
    propertyPostcode: data.propertyPostcode ?? "",
    propertyLot: data.propertyLot ?? "",
    propertyPlan: data.propertyPlan ?? "",
    propertyTitleReference: data.propertyTitleReference ?? "",
    commission: initialValues?.commission || commissionDisplay,
    seller1Name: seller1?.entityName ?? "",
    seller1NameLine2: "",
    seller1Address: stripSuburbSuffix(seller1?.address, seller1?.suburb ?? data.propertySuburb),
    seller1Address2: seller1?.address2 ?? "",
    seller1Suburb: data.propertySuburb ?? "",
    seller1State: data.propertyState ?? "",
    seller1Postcode: data.propertyPostcode ?? "",
    seller1Phone: seller1?.phoneNumber ?? "",
    seller1Mobile: seller1?.mobile ?? "",
    seller1Email: seller1?.emailAddress ?? "",
    seller1Abn: "",
    seller1Acn: "",
    seller1GstRegistered: seller1?.gstRegistered ?? "",
    seller1Fax: seller1?.fax ?? "",
    seller2Name: seller2?.entityName ?? "",
    seller2NameLine2: "",
    seller2Address: stripSuburbSuffix(seller2?.address, seller2?.suburb ?? data.propertySuburb),
    seller2Address2: seller2?.address2 ?? "",
    seller2Suburb: data.propertySuburb ?? "",
    seller2State: data.propertyState ?? "",
    seller2Postcode: data.propertyPostcode ?? "",
    seller2Phone: seller2?.phoneNumber ?? "",
    seller2Mobile: seller2?.mobile ?? "",
    seller2Email: seller2?.emailAddress ?? "",
    seller2Abn: "",
    seller2Acn: "",
    seller2GstRegistered: seller2?.gstRegistered ?? "",
    seller2Fax: seller2?.fax ?? "",
    seller3Name: seller3?.entityName ?? "",
    seller3NameLine2: "",
    seller3Address: stripSuburbSuffix(seller3?.address, seller3?.suburb ?? data.propertySuburb),
    seller3Address2: seller3?.address2 ?? "",
    seller3Suburb: data.propertySuburb ?? "",
    seller3State: data.propertyState ?? "",
    seller3Postcode: data.propertyPostcode ?? "",
    seller3Phone: seller3?.phoneNumber ?? "",
    seller3Mobile: seller3?.mobile ?? "",
    seller3Email: seller3?.emailAddress ?? "",
    seller3Abn: "",
    seller3Acn: "",
    seller3GstRegistered: seller3?.gstRegistered ?? "",
    seller3Fax: seller3?.fax ?? "",
    part6ClientName: seller1?.entityName ?? "",
    part6ClientName2: seller2?.entityName ?? "",
    part6ClientName3: seller3?.entityName ?? "",
    client1FullName1: seller1?.entityName ?? "",
    client2FullName1: seller2?.entityName ?? "",
    // Form 6 is a listing-appointment form — sale service type is always applicable
    serviceTypeSale: "true",
    priceAmount,
    priceTypeList: data.appraisedAmount ? "true" : "false",
  }
}

export function mapProFormaData(
  data: ProFormaApiData,
  propertyAddress: string | undefined,
): Record<string, string> {
  const buyer1 = data.buyers[0]
  const buyer1Member = buyer1?.members?.[0]
  const buyer1Name = buyer1Member?.memberName ?? buyer1?.entityName ?? ""
  const buyer2Name = buyer1?.members?.[1]?.memberName ?? ""
  const buyerAddress = buyer1Member?.memberAddress ?? buyer1?.address ?? ""
  const buyerPhone = buyer1Member?.memberPhoneNumber ?? buyer1?.phoneNumber ?? ""
  return {
    propertyAddress: propertyAddress ?? "",
    buyer1Name,
    buyer2Name,
    buyerAddress,
    buyerPhone,
    buyerEmail: buyer1?.emailAddress ?? "",
    solicitorName: data.solicitor?.entityName ?? "",
    solicitorPhone: data.solicitor?.phoneNumber ?? "",
    solicitorAddress: data.solicitor?.address ?? "",
    solicitorEmail: data.solicitor?.emailAddress ?? "",
  }
}
