import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { FIELD_MAP } from "./pdf-prefill-contract-sp-field-map"
import { CHECKBOX_MAP } from "./pdf-prefill-contract-sp-checkbox-map"

export interface ContractSalePurchasePrefillValues {
  contractDate?: string
  // Seller 1
  seller1Name?: string
  seller1Abn?: string
  seller1Address?: string
  seller1Suburb?: string
  seller1State?: string
  seller1Postcode?: string
  seller1Phone?: string
  seller1Mobile?: string
  seller1Email?: string
  // Seller 2
  seller2Name?: string
  seller2Abn?: string
  seller2Address?: string
  seller2Suburb?: string
  seller2State?: string
  seller2Postcode?: string
  seller2Phone?: string
  seller2Mobile?: string
  seller2Email?: string
  // Seller's Agent
  agentName?: string
  agentAbn?: string
  agentLicenceNumber?: string
  agentAddress?: string
  agentSuburb?: string
  agentState?: string
  agentPostcode?: string
  agentPhone?: string
  agentMobile?: string
  agentEmail?: string
  // Seller's Solicitor
  sellerSolicitorName?: string
  sellerSolicitorRef?: string
  sellerSolicitorAddress?: string
  sellerSolicitorSuburb?: string
  sellerSolicitorState?: string
  sellerSolicitorPostcode?: string
  sellerSolicitorPhone?: string
  sellerSolicitorMobile?: string
  sellerSolicitorEmail?: string
  // Buyer 1
  buyer1Name?: string
  buyer1Abn?: string
  buyer1Address?: string
  buyer1Suburb?: string
  buyer1State?: string
  buyer1Postcode?: string
  buyer1Phone?: string
  buyer1Mobile?: string
  buyer1Email?: string
  // Buyer 2
  buyer2Name?: string
  buyer2Abn?: string
  buyer2Address?: string
  buyer2Suburb?: string
  buyer2State?: string
  buyer2Postcode?: string
  buyer2Phone?: string
  buyer2Mobile?: string
  buyer2Email?: string
  // Buyer's Agent
  buyerAgentName?: string
  buyerAgentAbn?: string
  buyerAgentLicenceNumber?: string
  buyerAgentAddress?: string
  buyerAgentSuburb?: string
  buyerAgentState?: string
  buyerAgentPostcode?: string
  buyerAgentPhone?: string
  buyerAgentMobile?: string
  buyerAgentEmail?: string
  // Buyer's Solicitor (page 2)
  buyerSolicitorName?: string
  buyerSolicitorRef?: string
  buyerSolicitorAddress?: string
  buyerSolicitorSuburb?: string
  buyerSolicitorState?: string
  buyerSolicitorPostcode?: string
  buyerSolicitorPhone?: string
  buyerSolicitorMobile?: string
  buyerSolicitorEmail?: string
  // Property (page 2)
  address?: string
  suburb?: string
  state?: string
  postcode?: string
  lot?: string
  plan?: string
  area?: string
  titleReference?: string
  soldAsOption?: string      // "freehold"|"leasehold"
  landUseOption?: string     // "builtOn"|"vacant"
  presentUse?: string
  localGovernment?: string
  excludedFixtures?: string
  includedChattels?: string
  // Price (page 2)
  purchasePrice?: string
  depositInitial?: string
  depositBalance?: string
  depositPayableOn?: string
  depositHolder?: string
  depositHolderTrustAccount?: string
  depositBank?: string
  depositBsb?: string
  depositAccountNo?: string
  defaultInterestRate?: string
  // Settlement / Conditions — page 3
  settlementDate?: string
  gstOption?: string          // "no-gst"|"buyer-pays"|"margin-scheme"|"going-concern"|"farm-land"
  gstWithholdingOption?: string  // "no"|"yes"
  gstWithholdingObligationOption?: string  // "not-required"|"required"
  landTaxOption?: string      // "no-adjustment"|"single-holding"|"actual-liability"
  financeAmount?: string
  financier?: string
  financeDate?: string
  inspectionDate?: string
  // Disclosures — page 4
  disclosureOption?: string   // "given"|"not-given"
  encumbrancesText?: string
  tenanciesOption?: string    // "no"|"yes"
  rentalHistoryOption?: string // "no"|"yes"
  lastRentDate?: string
  treeOrdersOption?: string   // "no"|"yes"
  poolQ1Option?: string       // "no"|"yes"
  poolQ2Option?: string       // "no"|"yes"
  safetySwitchOption?: string // "installed"|"not-installed"
  smokeAlarmsOption?: string  // "installed"|"not-installed"
  // Community Titles / Building Units — page 5
  communityTitlesA?: string
  communityTitlesB?: string
  communityTitlesC?: string
  communityTitlesD?: string
  communityTitlesE?: string
  communityTitlesF?: string
  communityTitlesG?: string
  recordsInspectionDate?: string
  buildingUnitsNoticeA?: string
  buildingUnitsNoticeB?: string
  buildingUnitsNoticeC?: string
  buildingUnitsNoticeD?: string
  buildingUnitsInspectionDate?: string
  // Special Conditions + Signing — page 6
  specialConditions?: string
  buyer1SigningName?: string
  buyer1SigningDate?: string
  buyer1Witness?: string
  buyer2SigningName?: string
  buyer2SigningDate?: string
  buyer2Witness?: string
  seller1SigningName?: string
  seller1SigningDate?: string
  seller1Witness?: string
  seller2SigningName?: string
  seller2SigningDate?: string
  seller2Witness?: string
  [key: string]: string | undefined
}

export async function prefillContractSalePurchase(
  masterPdfBytes: ArrayBuffer,
  values: ContractSalePurchasePrefillValues,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(masterPdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  // Text fields
  for (const [key, coord] of Object.entries(FIELD_MAP)) {
    const text = values[key]
    if (!text) continue
    const page = pages[coord.page]
    if (!page) continue
    const size = coord.size ?? 9
    if (coord.bgWidth) {
      const boxHeight = size + 4
      page.drawRectangle({ x: coord.x, y: coord.y - 2, width: coord.bgWidth, height: boxHeight,
        color: rgb(1, 1, 1), borderWidth: 0 })
      const textWidth = font.widthOfTextAtSize(text, size)
      const textX = coord.x + (coord.bgWidth - textWidth) / 2
      page.drawText(text, { x: textX, y: coord.y, size, font })
    } else {
      page.drawText(text, { x: coord.x, y: coord.y, size, font })
    }
  }

  // Checkbox / radio fields — draw a ✓ inside the matching □ glyph
  for (const [key, optionMap] of Object.entries(CHECKBOX_MAP)) {
    const selected = values[key]
    if (!selected) continue
    const coord = optionMap[selected]
    if (!coord) continue
    const page = pages[coord.page]
    if (!page) continue
    // Two-stroke checkmark — size driven by coord.size (default 5)
    const cs = coord.size ?? 5
    page.drawLine({ start: { x: coord.x,               y: coord.y + cs * 0.57 }, end: { x: coord.x + cs * 0.43, y: coord.y      }, thickness: 1.5, color: rgb(0, 0, 0) })
    page.drawLine({ start: { x: coord.x + cs * 0.43,   y: coord.y             }, end: { x: coord.x + cs,        y: coord.y + cs }, thickness: 1.5, color: rgb(0, 0, 0) })
  }

  // Special conditions — word-wrap and draw multiple lines starting near box top
  if (values.specialConditions) {
    const specPage = pages[5]
    if (specPage) {
      const maxCharsPerLine = 85
      const lineAdvance = 12
      const xStart = 70
      const yStart = 760   // top of the special conditions text box (calibrated)
      const yMin   = 577   // stop before the bottom line at y=575

      let y = yStart
      let currentLine = ""
      for (const word of values.specialConditions.split(" ")) {
        const candidate = currentLine ? `${currentLine} ${word}` : word
        if (candidate.length > maxCharsPerLine) {
          if (currentLine && y >= yMin) {
            specPage.drawText(currentLine, { x: xStart, y, size: 9, font })
            y -= lineAdvance
          }
          currentLine = word
        } else {
          currentLine = candidate
        }
      }
      if (currentLine && y >= yMin) {
        specPage.drawText(currentLine, { x: xStart, y, size: 9, font })
      }
    }
  }

  return pdfDoc.save()
}
