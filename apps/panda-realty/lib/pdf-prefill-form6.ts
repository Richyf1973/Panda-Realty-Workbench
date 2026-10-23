import { PDFDocument } from "pdf-lib"

import {
  CHECKBOX_MAP,
  DATE_FIELD_MAP,
  LICENSEE_TYPE_CHECKBOX,
  RADIO_GROUP_MAP,
  TEXT_FIELD_MAP,
} from "./form6-field-map"

export type { Form6PrefillValues } from "./form6-field-map"
import type { Form6PrefillValues } from "./form6-field-map"

const DEFAULT_FONT_SIZE = 10

// Per-field font size overrides — add entries here to tune specific fields independently of DEFAULT_FONT_SIZE.
const FIELD_FONT_SIZE: Partial<Record<keyof Form6PrefillValues, number>> = {
  commission: 10,
  advertisingText: 10,
}

// Maps a field key to the prefillValues key that holds the user's runtime font size selection.
const FONT_SIZE_VALUE_KEY: Partial<Record<keyof Form6PrefillValues, keyof Form6PrefillValues>> = {
  commission: "commissionFontSize",
  advertisingText: "advertisingTextFontSize",
}

function getEffectiveFontSize(key: keyof Form6PrefillValues, values: Form6PrefillValues): number {
  const sizeKey = FONT_SIZE_VALUE_KEY[key]
  if (sizeKey) {
    const parsed = parseInt(values[sizeKey] ?? "", 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return FIELD_FONT_SIZE[key] ?? DEFAULT_FONT_SIZE
}

function splitIsoDate(iso: string): { day: string; month: string; year: string } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return { year: m[1], month: m[2], day: m[3] }
}

function trySetText(
  form: ReturnType<PDFDocument["getForm"]>,
  fieldName: string,
  value: string,
  fontSize: number = DEFAULT_FONT_SIZE,
) {
  try {
    const field = form.getTextField(fieldName)
    field.setFontSize(fontSize)
    field.setText(value)
  } catch {
    // Field absent in this PDF version — skip silently
  }
}

function tryCheck(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, checked: boolean) {
  try {
    const cb = form.getCheckBox(fieldName)
    if (checked) cb.check()
    else cb.uncheck()
  } catch {
    // Field absent in this PDF version — skip silently
  }
}

export async function prefillForm6(
  masterPdfBytes: ArrayBuffer,
  values: Form6PrefillValues,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(masterPdfBytes)
  const form = pdfDoc.getForm()

  // Text fields
  for (const [key, fieldName] of Object.entries(TEXT_FIELD_MAP) as [keyof Form6PrefillValues, string][]) {
    const value = values[key]
    if (value) trySetText(form, fieldName, value, getEffectiveFontSize(key, values))
  }

  // Combine all owner names with AND for the single Part 6 "Client" acknowledgement field
  const combinedClientName = [values.part6ClientName, values.part6ClientName2, values.part6ClientName3]
    .filter(Boolean)
    .join(" AND ")
  if (combinedClientName) trySetText(form, "Client", combinedClientName)

  if (values.propertyDescription1) trySetText(form, "Description 1", values.propertyDescription1)

  // Section 4 Instructions — combine with search criteria if set
  const instructionsText = [
    values.instructions,
    values.priceSearchCriteria ? `Search criteria: $${values.priceSearchCriteria}` : undefined,
  ].filter(Boolean).join("\n\n")
  if (instructionsText) trySetText(form, "Section 4 Instructions/conditions", instructionsText)

  // Date fields — split ISO "YYYY-MM-DD" into separate day/month/year TextFields
  for (const [key, [dayField, monthField, yearField]] of Object.entries(DATE_FIELD_MAP) as [keyof Form6PrefillValues, [string, string, string]][]) {
    const iso = values[key]
    if (!iso) continue
    const parts = splitIsoDate(iso)
    if (!parts) continue
    trySetText(form, dayField, parts.day)
    trySetText(form, monthField, parts.month)
    trySetText(form, yearField, parts.year)
  }

  // Checkboxes — "true" string → check, "false" or absent → uncheck
  for (const [key, fieldName] of Object.entries(CHECKBOX_MAP) as [keyof Form6PrefillValues, string][]) {
    const value = values[key]
    if (value !== undefined) tryCheck(form, fieldName, value === "true")
  }

  // Default: auto-check Sale unless explicitly overridden
  if (values.serviceTypeSale === undefined) tryCheck(form, "Sale", true)

  // Radio groups
  for (const [key, [groupName, optionMap]] of Object.entries(RADIO_GROUP_MAP) as [keyof Form6PrefillValues, [string, Record<string, string>]][]) {
    const value = values[key]
    if (!value) continue
    const pdfOption = optionMap[value]
    if (!pdfOption) continue
    try {
      form.getRadioGroup(groupName).select(pdfOption)
    } catch {
      // Field absent in this PDF version — skip silently
    }
  }

  // Licensee type checkboxes — map from licenseeType string to the correct checkbox
  if (values.agentLicenseeType) {
    const fieldName = LICENSEE_TYPE_CHECKBOX[values.agentLicenseeType]
    if (fieldName) tryCheck(form, fieldName, true)
  }

  return pdfDoc.save({ updateFieldAppearances: true })
}
