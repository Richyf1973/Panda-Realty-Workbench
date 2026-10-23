export type CheckboxField = {
  page: number
  x: number
  y: number
  size?: number
}

// Radio/checkbox option → coordinate of the □ glyph to mark with "x".
// Key format: values[fieldKey] === optionValue → draw marker at coord.
export const CHECKBOX_MAP: Record<string, Record<string, CheckboxField>> = {
  // Sold As — page 2 (index 1), right of title reference row
  soldAsOption: {
    "freehold":  { page: 1, x: 390, y: 490 },
    "leasehold": { page: 1, x: 440, y: 490 },
  },
  // Land Use — page 2 (index 1)
  landUseOption: {
    "builtOn": { page: 1, x: 76,  y: 462 },
    "vacant":  { page: 1, x: 139, y: 462 },
  },
  // GST section — page 3 (index 2), left column x≈76
  gstOption: {
    "no-gst":        { page: 2, x: 76, y: 659 },
    "buyer-pays":    { page: 2, x: 76, y: 643 },
    "margin-scheme": { page: 2, x: 76, y: 627 },
    "going-concern": { page: 2, x: 76, y: 611 },
    "farm-land":     { page: 2, x: 76, y: 595 },
  },
  // GST Withholding "Is buyer registered?" No/Yes — right column x≈392
  gstWithholdingOption: {
    "no":  { page: 2, x: 392, y: 546 },
    "yes": { page: 2, x: 392, y: 533.5 },
  },
  // GST Withholding Obligation — page 3 (index 2), left column x≈76
  gstWithholdingObligationOption: {
    "not-required": { page: 2, x: 76, y: 449 },
    "required":     { page: 2, x: 76, y: 416.5 },
  },
  // Land Tax — page 3 (index 2), left column x≈76
  landTaxOption: {
    "no-adjustment":    { page: 2, x: 76, y: 314 },
    "single-holding":   { page: 2, x: 76, y: 299 },
    "actual-liability": { page: 2, x: 76, y: 283 },
  },
  // Disclosure — page 4 (index 3), left column x≈78
  disclosureOption: {
    "given":     { page: 3, x: 78, y: 741 },
    "not-given": { page: 3, x: 78, y: 659 },
  },
  // Tenancies — page 4 (index 3), left column x≈305
  tenanciesOption: {
    "no":  { page: 3, x: 305, y: 503 },
    "yes": { page: 3, x: 305, y: 491 },
  },
  // Rental History — page 4 (index 3), right column x≈365
  rentalHistoryOption: {
    "no":  { page: 3, x: 365, y: 435 },
    "yes": { page: 3, x: 365, y: 422 },
  },
  // Tree Orders — page 4 (index 3), right column x≈365
  treeOrdersOption: {
    "no":  { page: 3, x: 365, y: 342 },
    "yes": { page: 3, x: 365, y: 329 },
  },
  // Pool Safety Q1 — page 4 (index 3), right column x≈365
  poolQ1Option: {
    "no":  { page: 3, x: 365, y: 276 },
    "yes": { page: 3, x: 365, y: 263 },
  },
  // Pool Safety Q2 — page 4 (index 3), right column x≈365
  poolQ2Option: {
    "no":  { page: 3, x: 365, y: 239 },
    "yes": { page: 3, x: 365, y: 227 },
  },
  // Electrical Safety Switch — page 4 (index 3), options column x≈255
  safetySwitchOption: {
    "installed":     { page: 3, x: 255, y: 161.5 },
    "not-installed": { page: 3, x: 255, y: 149 },
  },
  // Smoke Alarms — page 4 (index 3), options column x≈255
  smokeAlarmsOption: {
    "installed":     { page: 3, x: 255, y: 117.5 },
    "not-installed": { page: 3, x: 255, y: 105  },
  },
}
