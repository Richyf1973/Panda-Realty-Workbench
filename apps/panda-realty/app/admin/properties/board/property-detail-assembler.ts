// Pure functions that map raw DB rows to typed PropertyDetail domain objects.
// No DB calls, no server-only imports — safe to test in isolation.

import type {
  PropertyDetailBuyer,
  PropertyDetailContact,
  PropertyDetailMeeting,
  PropertyDetailNote,
  PropertyDetailOffer,
} from "./property-types"

// ─── Shared offer field shape ─────────────────────────────────────────────────

type RawOffer = {
  buyerOfferId: number
  propertyEntityId: number
  offer: string
  isAccepted: boolean
  dateOffered: string
  isCashOffer: boolean
  noConditions: boolean
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  subjectToSaleDays: number | null
  subjectToSaleStage: string | null
  subjectToSaleAddress: string | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  depositInitial: string | null
  depositBalance: string | null
  otherConditions: string | null
  customConditions: Array<{ label: string; days: number }> | null
  conditionNotes: string | null
  waiveCoolingOff: boolean | null
  isSubjectToFinance: boolean | null
  financePreApproved: boolean | null
  financeBank: string | null
  financeBankContactName: string | null
  financeBankContactPhone: string | null
  financeBankContactEmail: string | null
  suggestBuildingCompanies: boolean | null
  isSubjectToSale: boolean | null
  saleDaysBeforeListingLive: number | null
  saleIsUnconditional: boolean | null
  saleUnconditionalDate: string | null
  saleBuyerSettlementDate: string | null
  saleActiveConditions: string[] | null
  saleFreeAppraisal: boolean | null
  settlementPeriod: string | null
}

type RawEntity = {
  propertyEntityId: number
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
  entityCategoryId: number | null
  association: string | null
}

type RawNote = {
  propertyEntityNoteId: number
  propertyEntityId: number
  note: string
  createdBy: string | null
  createdAt: Date | null
}

type RawPropertyNote = {
  propertyListNoteId: number
  propertyEntityId: number | null
  note: string
  createdBy: string | null
  createdAt: Date | null
  entityName: string | null
  agentId: number | null
  agentName: string | null
  agentEmail: string | null
}

type RawMeeting = {
  propertyMeetingId: number
  propertyEntityId: number | null
  type: string
  title: string
  scheduledAt: Date
  durationMinutes: number | null
  notes: string | null
  googleCalendarEventId: string | null
  entityName: string | null
}

// ─── Shared offer field mapper ────────────────────────────────────────────────

function mapOfferFields(o: RawOffer): Omit<PropertyDetailOffer, "entityName"> {
  return {
    buyerOfferId: o.buyerOfferId,
    offer: o.offer,
    isAccepted: o.isAccepted,
    dateOffered: o.dateOffered,
    isCashOffer: o.isCashOffer,
    noConditions: o.noConditions,
    coolingOffDays: o.coolingOffDays,
    financeDays: o.financeDays,
    buildingPestDays: o.buildingPestDays,
    dueDiligenceDays: o.dueDiligenceDays,
    subjectToSaleDays: o.subjectToSaleDays,
    subjectToSaleStage: o.subjectToSaleStage,
    subjectToSaleAddress: o.subjectToSaleAddress,
    saleOfPropertyDays: o.saleOfPropertyDays,
    unconditionalContractDays: o.unconditionalContractDays,
    depositInitial: o.depositInitial,
    depositBalance: o.depositBalance,
    otherConditions: o.otherConditions,
    customConditions: o.customConditions,
    conditionNotes: o.conditionNotes,
    waiveCoolingOff: o.waiveCoolingOff,
    isSubjectToFinance: o.isSubjectToFinance,
    financePreApproved: o.financePreApproved,
    financeBank: o.financeBank,
    financeBankContactName: o.financeBankContactName,
    financeBankContactPhone: o.financeBankContactPhone,
    financeBankContactEmail: o.financeBankContactEmail,
    suggestBuildingCompanies: o.suggestBuildingCompanies,
    isSubjectToSale: o.isSubjectToSale,
    saleDaysBeforeListingLive: o.saleDaysBeforeListingLive,
    saleIsUnconditional: o.saleIsUnconditional,
    saleUnconditionalDate: o.saleUnconditionalDate,
    saleBuyerSettlementDate: o.saleBuyerSettlementDate,
    saleActiveConditions: o.saleActiveConditions,
    saleFreeAppraisal: o.saleFreeAppraisal,
    settlementPeriod: o.settlementPeriod,
  }
}

// ─── Assembly functions ───────────────────────────────────────────────────────

export function assembleBuyers(
  buyerEntities: RawEntity[],
  offersByEntityId: Map<number, RawOffer[]>,
  memberPropertyToSellAddressById: Map<number, string | null> = new Map(),
  memberResidenceAddressById: Map<number, string | null> = new Map(),
): PropertyDetailBuyer[] {
  return buyerEntities.map((e) => ({
    propertyEntityId: e.propertyEntityId,
    entityId: e.entityId,
    entityName: e.entityName,
    phoneNumber: e.phoneNumber,
    emailAddress: e.emailAddress,
    memberPropertyToSellAddress: memberPropertyToSellAddressById.get(e.entityId) ?? null,
    memberResidenceAddress: memberResidenceAddressById.get(e.entityId) ?? null,
    offers: (offersByEntityId.get(e.propertyEntityId) ?? []).map(mapOfferFields),
  }))
}

export function assembleContacts(contactEntities: RawEntity[]): PropertyDetailContact[] {
  return contactEntities.map((e) => ({
    propertyEntityId: e.propertyEntityId,
    entityId: e.entityId,
    entityName: e.entityName,
    phoneNumber: e.phoneNumber,
    emailAddress: e.emailAddress,
    association: e.association ?? null,
  }))
}

export function assembleOffers(
  offersRaw: RawOffer[],
  entityNameById: Map<number, string>,
): PropertyDetailOffer[] {
  return offersRaw.map((o) => ({
    ...mapOfferFields(o),
    entityName: entityNameById.get(o.propertyEntityId) ?? "Unknown",
  }))
}

export function assembleNotes(
  entityNotesRaw: RawNote[],
  propertyNotesRaw: RawPropertyNote[],
  entityNameById: Map<number, string>,
): PropertyDetailNote[] {
  const entityNotes: PropertyDetailNote[] = entityNotesRaw.map((n) => ({
    noteId: n.propertyEntityNoteId,
    propertyEntityId: n.propertyEntityId,
    note: n.note,
    createdBy: n.createdBy,
    createdAt: n.createdAt,
    entityName: entityNameById.get(n.propertyEntityId) ?? null,
    source: "entity" as const,
    agentId: null,
    agentName: null,
    agentEmail: null,
  }))

  const propNotes: PropertyDetailNote[] = propertyNotesRaw.map((n) => ({
    noteId: n.propertyListNoteId,
    propertyEntityId: n.propertyEntityId ?? null,
    note: n.note,
    createdBy: n.createdBy,
    createdAt: n.createdAt,
    entityName: n.entityName ?? null,
    source: "property" as const,
    agentId: n.agentId ?? null,
    agentName: n.agentName ?? null,
    agentEmail: n.agentEmail ?? null,
  }))

  return [...entityNotes, ...propNotes].sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
  )
}

export function assembleMeetings(meetingsRaw: RawMeeting[]): PropertyDetailMeeting[] {
  return meetingsRaw.map((m) => ({
    propertyMeetingId: m.propertyMeetingId,
    propertyEntityId: m.propertyEntityId ?? null,
    type: m.type as "meeting" | "reminder",
    title: m.title,
    scheduledAt: m.scheduledAt,
    durationMinutes: m.durationMinutes ?? null,
    notes: m.notes ?? null,
    googleCalendarEventId: m.googleCalendarEventId ?? null,
    buyerName: m.entityName ?? null,
  }))
}

export function groupOffersByEntityId(offersRaw: RawOffer[]): Map<number, RawOffer[]> {
  const map = new Map<number, RawOffer[]>()
  for (const offer of offersRaw) {
    const bucket = map.get(offer.propertyEntityId) ?? []
    bucket.push(offer)
    map.set(offer.propertyEntityId, bucket)
  }
  return map
}
