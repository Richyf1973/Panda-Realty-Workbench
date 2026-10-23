/**
 * Web Worker — parses an XLSX file (RPData/CoreLogic export) off the main thread
 * and posts rows back in chunks for the server to upsert.
 *
 * Message protocol:
 *   IN:  { type: "parse", file: File }
 *   OUT: { type: "chunk",  rows: PropertyImportRow[], chunkIndex: number, totalChunks: number }
 *       | { type: "done",   totalRows: number, skipped: number }
 *       | { type: "error",  message: string }
 */

import * as XLSX from "xlsx"

export interface PropertyImportRow {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  councilArea: string | null
  propertyType: string
  bed: number
  bath: number
  car: number
  landSize: string | null
  buildingArea: number | null
  yearBuilt: number | null
  salePrice: string | null
  saleDate: string | null
  settlementDate: string | null
  saleType: string | null
  agency: string | null
  agent: string | null
  improve: string | null
  construction: string | null
  landUse1: string | null
  zoning: string | null
  developmentZone: string | null
  primaryPlan: string | null
  rpd: string | null
  valuationNo: string | null
  valuationType: string | null
  valuationAmount: string | null
  valuationDate: string | null
  owner1name: string | null
  owner1address: string | null
  owner2name: string | null
  owner2address: string | null
  owner3name: string | null
  owner3address: string | null
  ownerType: string | null
  vendor1name: string | null
  vendor1address: string | null
  vendor2name: string | null
  vendor2address: string | null
  vendor3name: string | null
  vendor3address: string | null
  relationship: string | null
  openInRpp: string | null
}

const CHUNK_SIZE = 1_000

// Excel column letters → 0-based index (standard / legacy format)
const COL = {
  B: 1, // Street Address
  C: 2, // Suburb
  D: 3, // State
  E: 4, // Postcode
  F: 5, // Council Area
  G: 6, // Property Type
  H: 7, // Bed
  I: 8, // Bath
  J: 9, // Car
  K: 10, // Land Size (m²)
  L: 11, // Floor Size (m²) → buildingArea
  M: 12, // Year Built
  N: 13, // Sale Price
  O: 14, // Sale Date
  P: 15, // Settlement Date
  Q: 16, // Sale Type
  R: 17, // Agency
  S: 18, // Agent
  T: 19, // Land Use
  U: 20, // Development Zone
  V: 21, // Parcel Details → rpd
  W: 22, // Owner 1 Name
  X: 23, // Owner 2 Name
  Y: 24, // Owner 3 Name
  Z: 25, // Owner Type → owner_type
  AA: 26, // Vendor 1 Name
  AB: 27, // Vendor 2 Name
  AC: 28, // Vendor 3 Name
  AD: 29, // Open in RPData
} as const

// Housekeeping format: headers on row 1, shifted columns, more fields
const COL_HK = {
  B: 1,  // Street Address
  C: 2,  // Suburb
  D: 3,  // State
  E: 4,  // Postcode
  F: 5,  // Property Type/Category (no council area)
  G: 6,  // Bed
  H: 7,  // Bath
  I: 8,  // Car
  J: 9,  // Land Size (no year built)
  K: 10, // Building Area
  L: 11, // Sale Price
  M: 12, // Sale Date
  N: 13, // Settlement Date
  O: 14, // Sale Type
  P: 15, // Agency
  Q: 16, // Agent
  R: 17, // Improve/Improvement
  S: 18, // Construction
  T: 19, // Land Use 1
  U: 20, // Zoning
  V: 21, // Development Zone
  W: 22, // Primary Plan/Lot Plan
  X: 23, // RPD
  Y: 24, // Valuation No
  Z: 25, // Valuation Type
  AA: 26, // Valuation Amount
  AB: 27, // Valuation Date
  AC: 28, // Owner 1 Name
  AD: 29, // Owner 1 Address
  AE: 30, // Owner 2 Name
  AF: 31, // Owner 2 Address
  AG: 32, // Owner 3 Name
  AH: 33, // Owner 3 Address
  AI: 34, // Vendor 1 Name
  AJ: 35, // Vendor 1 Address
  AK: 36, // Vendor 2 Name
  AL: 37, // Vendor 2 Address
  AM: 38, // Vendor 3 Name
  AN: 39, // Vendor 3 Address
  AO: 40, // Relationship
  AP: 41, // Open in RPP
} as const

function cellStr(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = sheet[addr] as XLSX.CellObject | undefined
  if (!cell) return ""
  // If cell has a formatted value use that, otherwise raw value
  const v = cell.w ?? String(cell.v ?? "")
  return v.trim()
}

function cellFormula(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
): string | undefined {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = sheet[addr] as (XLSX.CellObject & { f?: string }) | undefined
  return cell?.f
}

function extractHyperlinkUrl(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
): string | null {
  // Try formula first: =HYPERLINK("url", ...)
  const formula = cellFormula(sheet, row, col)
  if (formula) {
    const match = formula.match(/HYPERLINK\("([^"]+)"/i)
    if (match) return match[1]
  }
  // Fall back to hyperlink object (some XLSX writers store it here)
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = sheet[addr] as
    | (XLSX.CellObject & { l?: { Target?: string } })
    | undefined
  if (cell?.l?.Target) return cell.l.Target
  // Fall back to cell string value (might already be a URL)
  const str = cellStr(sheet, row, col)
  if (str.startsWith("http")) return str
  return null
}

function parsePrice(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[$,\s]/g, "")
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  return String(n)
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  // Handle "14 Nov 2015" format
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  // Return ISO date string (no time component, matching DB format)
  return d.toISOString().slice(0, 19).replace("T", " ")
}

function parseIntOrNull(raw: string): number | null {
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function parseNumericOrNull(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[,\s]/g, "")
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? String(n) : null
}

function strOrNull(raw: string): string | null {
  return raw === "" || raw === "-" ? null : raw
}

type SheetFormat = "standard" | "housekeeping" | "legacy"

function detectFormat(
  sheet: XLSX.WorkSheet,
): { format: SheetFormat; dataStartRow: number } {
  // Housekeeping format: headers on Excel row 1 (0-based: 0)
  if (cellStr(sheet, 0, COL.B).toLowerCase() === "street address")
    return { format: "housekeeping", dataStartRow: 1 }
  // Standard format: headers on Excel row 3 (0-based: 2)
  if (cellStr(sheet, 2, COL.B).toLowerCase() === "street address")
    return { format: "standard", dataStartRow: 3 }
  // Legacy format: data starts at 0-based row 5 (Excel row 6)
  return { format: "legacy", dataStartRow: 5 }
}

self.onmessage = async (e: MessageEvent) => {
  try {
    if (e.data?.type !== "parse" || !(e.data.file instanceof File)) {
      throw new Error("Expected message { type: 'parse', file: File }")
    }

    const file: File = e.data.file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellFormula: true,
      cellDates: false,
    })

    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw new Error("No worksheets found in file")

    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1")
    const { format, dataStartRow } = detectFormat(sheet)
    const lastRow = range.e.r

    const rows: PropertyImportRow[] = []
    let skipped = 0

    for (let r = dataStartRow; r <= lastRow; r++) {
      const streetAddress = cellStr(sheet, r, COL.B)
      const suburb = cellStr(sheet, r, COL.C)
      const state = cellStr(sheet, r, COL.D)
      const postcode = cellStr(sheet, r, COL.E)
      const propertyType =
        format === "housekeeping"
          ? cellStr(sheet, r, COL_HK.F)
          : cellStr(sheet, r, COL.G)

      // Skip rows missing required fields
      if (!streetAddress || !suburb || !state || !postcode || !propertyType) {
        // Only count as skipped if the row has any content at all
        const hasAnyContent = streetAddress || suburb || state || postcode
        if (hasAnyContent) skipped++
        continue
      }

      if (format === "housekeeping") {
        rows.push({
          streetAddress,
          suburb,
          state,
          postcode,
          councilArea: null,
          propertyType,
          bed: parseIntOrNull(cellStr(sheet, r, COL_HK.G)) ?? 0,
          bath: parseIntOrNull(cellStr(sheet, r, COL_HK.H)) ?? 0,
          car: parseIntOrNull(cellStr(sheet, r, COL_HK.I)) ?? 0,
          landSize: parseNumericOrNull(cellStr(sheet, r, COL_HK.J)),
          buildingArea: parseIntOrNull(cellStr(sheet, r, COL_HK.K)),
          yearBuilt: null,
          salePrice: parsePrice(cellStr(sheet, r, COL_HK.L)),
          saleDate: parseDate(cellStr(sheet, r, COL_HK.M)),
          settlementDate: parseDate(cellStr(sheet, r, COL_HK.N)),
          saleType: strOrNull(cellStr(sheet, r, COL_HK.O)),
          agency: strOrNull(cellStr(sheet, r, COL_HK.P)),
          agent: strOrNull(cellStr(sheet, r, COL_HK.Q)),
          improve: strOrNull(cellStr(sheet, r, COL_HK.R)),
          construction: strOrNull(cellStr(sheet, r, COL_HK.S)),
          landUse1: strOrNull(cellStr(sheet, r, COL_HK.T)),
          zoning: strOrNull(cellStr(sheet, r, COL_HK.U)),
          developmentZone: strOrNull(cellStr(sheet, r, COL_HK.V)),
          primaryPlan: strOrNull(cellStr(sheet, r, COL_HK.W)),
          rpd: strOrNull(cellStr(sheet, r, COL_HK.X)),
          valuationNo: strOrNull(cellStr(sheet, r, COL_HK.Y)),
          valuationType: strOrNull(cellStr(sheet, r, COL_HK.Z)),
          valuationAmount: parsePrice(cellStr(sheet, r, COL_HK.AA)),
          valuationDate: parseDate(cellStr(sheet, r, COL_HK.AB)),
          owner1name: strOrNull(cellStr(sheet, r, COL_HK.AC)),
          owner1address: strOrNull(cellStr(sheet, r, COL_HK.AD)),
          owner2name: strOrNull(cellStr(sheet, r, COL_HK.AE)),
          owner2address: strOrNull(cellStr(sheet, r, COL_HK.AF)),
          owner3name: strOrNull(cellStr(sheet, r, COL_HK.AG)),
          owner3address: strOrNull(cellStr(sheet, r, COL_HK.AH)),
          ownerType: null,
          vendor1name: strOrNull(cellStr(sheet, r, COL_HK.AI)),
          vendor1address: strOrNull(cellStr(sheet, r, COL_HK.AJ)),
          vendor2name: strOrNull(cellStr(sheet, r, COL_HK.AK)),
          vendor2address: strOrNull(cellStr(sheet, r, COL_HK.AL)),
          vendor3name: strOrNull(cellStr(sheet, r, COL_HK.AM)),
          vendor3address: strOrNull(cellStr(sheet, r, COL_HK.AN)),
          relationship: strOrNull(cellStr(sheet, r, COL_HK.AO)),
          openInRpp: extractHyperlinkUrl(sheet, r, COL_HK.AP),
        })
      } else {
        rows.push({
          streetAddress,
          suburb,
          state,
          postcode,
          councilArea: strOrNull(cellStr(sheet, r, COL.F)),
          propertyType,
          bed: parseIntOrNull(cellStr(sheet, r, COL.H)) ?? 0,
          bath: parseIntOrNull(cellStr(sheet, r, COL.I)) ?? 0,
          car: parseIntOrNull(cellStr(sheet, r, COL.J)) ?? 0,
          landSize: parseNumericOrNull(cellStr(sheet, r, COL.K)),
          buildingArea: parseIntOrNull(cellStr(sheet, r, COL.L)),
          yearBuilt: parseIntOrNull(cellStr(sheet, r, COL.M)),
          salePrice: parsePrice(cellStr(sheet, r, COL.N)),
          saleDate: parseDate(cellStr(sheet, r, COL.O)),
          settlementDate: parseDate(cellStr(sheet, r, COL.P)),
          saleType: strOrNull(cellStr(sheet, r, COL.Q)),
          agency: strOrNull(cellStr(sheet, r, COL.R)),
          agent: strOrNull(cellStr(sheet, r, COL.S)),
          improve: null,
          construction: null,
          landUse1: strOrNull(cellStr(sheet, r, COL.T)),
          zoning: null,
          developmentZone: strOrNull(cellStr(sheet, r, COL.U)),
          primaryPlan: null,
          rpd: strOrNull(cellStr(sheet, r, COL.V)),
          valuationNo: null,
          valuationType: null,
          valuationAmount: null,
          valuationDate: null,
          owner1name: strOrNull(cellStr(sheet, r, COL.W)),
          owner1address: null,
          owner2name: strOrNull(cellStr(sheet, r, COL.X)),
          owner2address: null,
          owner3name: strOrNull(cellStr(sheet, r, COL.Y)),
          owner3address: null,
          ownerType: strOrNull(cellStr(sheet, r, COL.Z)),
          vendor1name: strOrNull(cellStr(sheet, r, COL.AA)),
          vendor1address: null,
          vendor2name: strOrNull(cellStr(sheet, r, COL.AB)),
          vendor2address: null,
          vendor3name: strOrNull(cellStr(sheet, r, COL.AC)),
          vendor3address: null,
          relationship: null,
          openInRpp: extractHyperlinkUrl(sheet, r, COL.AD),
        })
      }
    }

    // Post rows in chunks
    const totalChunks = Math.ceil(rows.length / CHUNK_SIZE) || 1
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const chunkIndex = Math.floor(i / CHUNK_SIZE)
      self.postMessage({ type: "chunk", rows: chunk, chunkIndex, totalChunks })
    }

    self.postMessage({ type: "done", totalRows: rows.length, skipped })
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
