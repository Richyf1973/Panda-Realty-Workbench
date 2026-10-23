import { computeConditionDueDate } from "./panda-property-completion-date"
import type { DueHighlightCandidate } from "./due-highlight"

/**
 * All the per-property data needed to derive its critical dates. Day counts come from the accepted
 * buyer offer; `settlementDate` lives directly on the property. Every candidate (settlement
 * included) requires a `contractDate` — a property with no contract produces no candidates.
 */
export type DueDateSource = {
  contractDate: Date | string | null
  disclosureDate?: Date | string | null
  settlementDate: Date | string | null
  noConditions: boolean | null
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  /** Subject-to-sale day count → "Completion Date". */
  subjectToSaleDays: number | null
  customConditions: Array<{ label: string; days: number }> | null
}

/** The accepted-offer condition fields needed to derive a property's due-date candidates. */
export type AcceptedOfferDueDateInput = {
  noConditions: boolean | null
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  subjectToSaleDays: number | null
  customConditions: Array<{ label: string; days: number }> | null
  settlementDate: Date | string | null
}

/**
 * Field-map a property + its accepted offer into the {@link DueDateSource} fed to
 * {@link buildDueDateCandidates}. The accepted offer is the source of truth for settlement, with
 * the property column as fallback. Shared by the list enrichment and the next-condition-due sync so
 * both derive candidates from an identical input (add a new condition field in exactly one place).
 */
export function acceptedOfferDueDateSource(
  prop: { contractDate: Date | string | null; settlementDate: Date | string | null; disclosureDate?: Date | string | null },
  offer: AcceptedOfferDueDateInput | null | undefined,
): DueDateSource {
  return {
    contractDate: prop.contractDate,
    disclosureDate: prop.disclosureDate,
    settlementDate: offer?.settlementDate ?? prop.settlementDate,
    noConditions: offer?.noConditions ?? null,
    coolingOffDays: offer?.coolingOffDays ?? null,
    financeDays: offer?.financeDays ?? null,
    buildingPestDays: offer?.buildingPestDays ?? null,
    dueDiligenceDays: offer?.dueDiligenceDays ?? null,
    saleOfPropertyDays: offer?.saleOfPropertyDays ?? null,
    unconditionalContractDays: offer?.unconditionalContractDays ?? null,
    subjectToSaleDays: offer?.subjectToSaleDays ?? null,
    customConditions: offer?.customConditions ?? null,
  }
}

function toDate(value: Date | string | null): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Build the list of critical-date candidates for a property — the single set fed to
 * {@link computeDueHighlight} by both the properties list and the pipeline board.
 *
 * Mirrors the list-API condition-date enrichment: cooling off is suppressed when `noConditions`;
 * all other derived milestones use `contract_date + days`. Settlement and custom conditions are
 * added on top.
 */
export function buildDueDateCandidates(src: DueDateSource): DueHighlightCandidate[] {
  const contractDate = toDate(src.contractDate)
  // No contract means no marker: a property without a contract date produces no due-date
  // candidates at all, so a stale imported settlement_date can never light up the highlight.
  if (contractDate == null) return []

  const addDays = (days: number | null) => computeConditionDueDate({ contractDate, days })
  // Manufactured Home: cooling off counts from disclosure date if set, otherwise contract date.
  const coolingOffBase = toDate(src.disclosureDate ?? null) ?? contractDate
  const addCoolingDays = (days: number | null) => computeConditionDueDate({ contractDate: coolingOffBase, days })

  const candidates: DueHighlightCandidate[] = [
    { label: "Cooling Off", date: src.noConditions ? null : addCoolingDays(src.coolingOffDays) },
    { label: "Finance", date: addDays(src.financeDays) },
    { label: "Building & Pest", date: addDays(src.buildingPestDays) },
    { label: "Due Diligence", date: addDays(src.dueDiligenceDays) },
    { label: "Sale of Property", date: addDays(src.saleOfPropertyDays) },
    { label: "Unconditional Contract", date: addDays(src.unconditionalContractDays) },
    { label: "Completion Date", date: addDays(src.subjectToSaleDays) },
    { label: "Settlement", date: toDate(src.settlementDate) },
  ]

  if (src.customConditions) {
    for (const c of src.customConditions) {
      candidates.push({ label: c.label, date: addDays(c.days) })
    }
  }

  return candidates.filter((c) => c.date != null)
}
