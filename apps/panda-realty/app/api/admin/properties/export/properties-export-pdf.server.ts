import "server-only"

import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

const COLUMN_WIDTHS: Record<string, number> = {
  propertyListId: 10,
  state: 9,
  postcode: 13,
  propertyType: 17,
  rpd: 16,
  openInRpp: 14,
  formattedTS: 16,
  advertisementId: 19,
  propertyStatusId: 14,
  streetAddress: 34,
  suburb: 24,
  councilArea: 24,
  zoning: 17,
  developmentZone: 24,
  primaryPlan: 22,
  landUse1: 22,
  combinedOwner: 32,
  buyerName: 26,
  buyerId: 10,
  agency: 26,
  agent: 24,
  relationship: 17,
  ownerType: 17,
  owner1name: 26,
  owner1email: 32,
  owner1phone: 20,
  owner1address: 34,
  owner2name: 26,
  owner2email: 32,
  owner2phone: 20,
  owner2address: 34,
  owner3name: 26,
  owner3email: 32,
  owner3phone: 20,
  owner3address: 34,
  vendor1name: 26,
  vendor1address: 34,
  vendor2name: 26,
  vendor2address: 34,
  vendor3name: 26,
  vendor3address: 34,
  bed: 9,
  bath: 9,
  car: 9,
  buildingArea: 16,
  landSize: 16,
  yearBuilt: 14,
  salePrice: 20,
  valuationAmount: 20,
  appraisedAmount: 20,
  commissionRate: 17,
  saleDate: 18,
  settlementDate: 18,
  valuationDate: 18,
  contractDate: 18,
  createdAt: 18,
  updatedAt: 18,
  priceUndisclosed: 13,
  isFavorite: 11,
  excludeFromReport: 14,
  improve: 26,
  construction: 22,
  saleType: 17,
  valuationType: 17,
  valuationNo: 17,
  propertyImage: 32,
  propertyAltLinks: 28,
  propertyAltLink: 28,
}

export function renderPropertiesExportPdf(input: {
  filterSummaryRow: [string]
  columnHeaders: string[]
  dataRows: (string | number)[][]
  selectedKeys: string[]
}): ArrayBuffer {
  const { filterSummaryRow, columnHeaders, dataRows, selectedKeys } = input

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 5
  const printableWidth = pageWidth - margin * 2

  const colWidths = selectedKeys.map((k) => COLUMN_WIDTHS[k] ?? 22)

  const chunks: number[][] = []
  let chunk: number[] = []
  let chunkWidth = 0
  for (let i = 0; i < colWidths.length; i++) {
    const w = colWidths[i]
    if (chunk.length > 0 && chunkWidth + w > printableWidth) {
      chunks.push(chunk)
      chunk = []
      chunkWidth = 0
    }
    chunk.push(i)
    chunkWidth += w
  }
  if (chunk.length > 0) chunks.push(chunk)

  const tableStyles = {
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 },
      overflow: "linebreak" as const,
      valign: "middle" as const,
      font: "helvetica",
      minCellHeight: 5,
    },
    headStyles: {
      fontStyle: "bold" as const,
      fillColor: [45, 45, 45] as [number, number, number],
      textColor: 255,
      fontSize: 6.5,
      minCellHeight: 7,
    },
    alternateRowStyles: { fillColor: [247, 247, 247] as [number, number, number] },
    theme: "striped" as const,
    showHead: "everyPage" as const,
  }

  chunks.forEach((colIndices, pageIndex) => {
    if (pageIndex > 0) doc.addPage()

    doc.setFontSize(6)
    doc.setFont("helvetica", "italic")
    doc.text(filterSummaryRow[0], margin, 7, { maxWidth: printableWidth })

    if (chunks.length > 1) {
      const label = `Columns ${colIndices[0] + 1}–${colIndices[colIndices.length - 1] + 1} of ${selectedKeys.length}`
      doc.setFont("helvetica", "normal")
      doc.text(label, pageWidth - margin, 7, { align: "right" })
    }

    const chunkHeaders = colIndices.map((i) => columnHeaders[i])
    const chunkBody = dataRows.map((row) => colIndices.map((i) => row[i]))
    const chunkColumnStyles: Record<number, { cellWidth: number }> = {}
    colIndices.forEach((colIdx, localIdx) => {
      chunkColumnStyles[localIdx] = { cellWidth: colWidths[colIdx] }
    })

    autoTable(doc, {
      startY: 10,
      margin: { left: margin, right: margin, top: margin, bottom: margin },
      columnStyles: chunkColumnStyles,
      head: [chunkHeaders],
      body: chunkBody,
      ...tableStyles,
    })
  })

  return doc.output("arraybuffer")
}
