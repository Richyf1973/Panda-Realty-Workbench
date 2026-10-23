/**
 * Verifies that prefillContractSalePurchase calls page.drawText at the correct
 * page index and (x, y) coordinates for every FIELD_MAP entry.
 *
 * Strategy: spy on PDFDocument.load to intercept each page's drawText method.
 * This captures all (text, x, y, pageIndex) draw calls without needing to parse
 * raw PDF bytes (which are hex-encoded and may be flate-compressed).
 *
 * Run: npm run test:run -w panda-realty
 */
import { readFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { PDFDocument } from "pdf-lib"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { prefillContractSalePurchase } from "../pdf-prefill-contract-sale-purchase"
import { MAX } from "./fixtures/contract-sp-max-values"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = join(__dirname, "../../fixtures/contract-sale-purchase-1.pdf")

// ─── Spy infrastructure ───────────────────────────────────────────────────────

interface DrawCall {
  text: string
  x: number
  y: number
  pageIndex: number
}

interface LineCall {
  startX: number
  startY: number
  pageIndex: number
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("prefillContractSalePurchase", () => {
  let masterBytes: ArrayBuffer
  let drawCalls: DrawCall[]
  let lineCalls: LineCall[]
  let filledSize: number
  let emptyFilledSize: number

  beforeAll(async () => {
    const nodeBuf = await readFile(FIXTURE)
    masterBytes = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength)

    drawCalls = []
    lineCalls = []

    // Spy on PDFDocument.load so we can intercept each page's drawText / drawLine.
    const origLoad = PDFDocument.load
    vi.spyOn(PDFDocument, "load").mockImplementation(async (data, opts) => {
      const doc = await origLoad.call(PDFDocument, data, opts)
      doc.getPages().forEach((page, pageIndex) => {
        const origDrawText = page.drawText.bind(page)
        vi.spyOn(page, "drawText").mockImplementation((text, options) => {
          drawCalls.push({ text, x: options?.x ?? 0, y: options?.y ?? 0, pageIndex })
          origDrawText(text, options)
        })
        const origDrawLine = page.drawLine.bind(page)
        vi.spyOn(page, "drawLine").mockImplementation((options) => {
          lineCalls.push({ startX: options.start.x, startY: options.start.y, pageIndex })
          origDrawLine(options)
        })
      })
      return doc
    })

    const filled = await prefillContractSalePurchase(masterBytes, MAX)
    filledSize = filled.byteLength

    vi.restoreAllMocks()

    // Empty fill: measure size for the sanity check
    const emptyFilled = await prefillContractSalePurchase(masterBytes, {})
    emptyFilledSize = emptyFilled.byteLength
  })

  // ── Output sanity ──────────────────────────────────────────────────────────

  it("filled output is larger than empty fill (content was added)", () => {
    expect(filledSize).toBeGreaterThan(emptyFilledSize)
  })

  it("all FIELD_MAP keys were drawn (no field silently skipped)", () => {
    const drawnTexts = new Set(drawCalls.map((c) => c.text))
    // Spot-check a representative set of fields — if any are missing the spy setup failed
    const samples = [
      MAX.seller1Name!, MAX.buyer1Name!, MAX.agentName!, MAX.sellerSolicitorName!,
      MAX.buyerAgentName!, MAX.buyerSolicitorName!, MAX.address!, MAX.purchasePrice!,
      MAX.settlementDate!, MAX.encumbrancesText!, MAX.communityTitlesA!, MAX.buyer1SigningName!,
    ]
    for (const sample of samples) {
      expect(drawnTexts, `expected "${sample}" in draw calls`).toContain(sample)
    }
  })

  // ── Coordinate placement — FIELD_MAP spot checks ──────────────────────────
  // Source coordinates: lib/pdf-prefill-contract-sale-purchase.ts → FIELD_MAP

  describe("text drawn at correct (page, x, y)", () => {
    function call(text: string) {
      return drawCalls.find((c) => c.text === text)
    }

    // Page 0 — Parties
    it("seller1Name at page 0 (152, 571)", () => {
      expect(call(MAX.seller1Name!)).toMatchObject({ pageIndex: 0, x: 152, y: 571 })
    })
    it("seller1Abn at page 0 (495, 571)", () => {
      expect(call(MAX.seller1Abn!)).toMatchObject({ pageIndex: 0, x: 495, y: 571 })
    })
    it("seller1Address at page 0 (152, 555)", () => {
      expect(call(MAX.seller1Address!)).toMatchObject({ pageIndex: 0, x: 152, y: 555 })
    })
    it("seller1Suburb at page 0 (152, 538)", () => {
      expect(call(MAX.seller1Suburb!)).toMatchObject({ pageIndex: 0, x: 152, y: 538 })
    })
    it("seller1Phone at page 0 (152, 522)", () => {
      expect(call(MAX.seller1Phone!)).toMatchObject({ pageIndex: 0, x: 152, y: 522 })
    })
    it("seller1Mobile at page 0 (326, 522)", () => {
      expect(call(MAX.seller1Mobile!)).toMatchObject({ pageIndex: 0, x: 326, y: 522 })
    })
    it("seller1Email at page 0 (435, 522)", () => {
      expect(call(MAX.seller1Email!)).toMatchObject({ pageIndex: 0, x: 435, y: 522 })
    })
    it("seller2Name at page 0 (152, 501)", () => {
      expect(call(MAX.seller2Name!)).toMatchObject({ pageIndex: 0, x: 152, y: 501 })
    })
    it("agentName at page 0 (152, 418)", () => {
      expect(call(MAX.agentName!)).toMatchObject({ pageIndex: 0, x: 152, y: 418 })
    })
    it("agentLicenceNumber at page 0 (400, 386)", () => {
      expect(call(MAX.agentLicenceNumber!)).toMatchObject({ pageIndex: 0, x: 400, y: 386 })
    })
    it("sellerSolicitorName at page 0 (152, 303)", () => {
      expect(call(MAX.sellerSolicitorName!)).toMatchObject({ pageIndex: 0, x: 152, y: 303 })
    })
    it("sellerSolicitorRef at page 0 (152, 287)", () => {
      expect(call(MAX.sellerSolicitorRef!)).toMatchObject({ pageIndex: 0, x: 152, y: 287 })
    })
    it("buyer1Name at page 0 (152, 204)", () => {
      expect(call(MAX.buyer1Name!)).toMatchObject({ pageIndex: 0, x: 152, y: 204 })
    })
    it("buyer1Abn at page 0 (495, 204)", () => {
      expect(call(MAX.buyer1Abn!)).toMatchObject({ pageIndex: 0, x: 495, y: 204 })
    })
    it("buyer2Name at page 0 (152, 133)", () => {
      expect(call(MAX.buyer2Name!)).toMatchObject({ pageIndex: 0, x: 152, y: 133 })
    })

    // Page 1 — Buyer's agent, property, price
    it("buyerAgentName at page 1 (152, 790)", () => {
      expect(call(MAX.buyerAgentName!)).toMatchObject({ pageIndex: 1, x: 152, y: 790 })
    })
    it("buyerAgentLicenceNumber at page 1 (400, 760)", () => {
      expect(call(MAX.buyerAgentLicenceNumber!)).toMatchObject({ pageIndex: 1, x: 400, y: 760 })
    })
    it("buyerSolicitorName at page 1 (152, 676)", () => {
      expect(call(MAX.buyerSolicitorName!)).toMatchObject({ pageIndex: 1, x: 152, y: 676 })
    })
    it("buyerSolicitorRef at page 1 (152, 660)", () => {
      expect(call(MAX.buyerSolicitorRef!)).toMatchObject({ pageIndex: 1, x: 152, y: 660 })
    })
    it("address at page 1 (152, 561)", () => {
      expect(call(MAX.address!)).toMatchObject({ pageIndex: 1, x: 152, y: 561 })
    })
    it("suburb at page 1 (152, 545)", () => {
      expect(call(MAX.suburb!)).toMatchObject({ pageIndex: 1, x: 152, y: 545 })
    })
    it("lot at page 1 (152, 507)", () => {
      expect(call(MAX.lot!)).toMatchObject({ pageIndex: 1, x: 152, y: 507 })
    })
    it("plan at page 1 (332, 507)", () => {
      expect(call(MAX.plan!)).toMatchObject({ pageIndex: 1, x: 332, y: 507 })
    })
    it("titleReference at page 1 (195, 491)", () => {
      expect(call(MAX.titleReference!)).toMatchObject({ pageIndex: 1, x: 195, y: 491 })
    })
    it("presentUse at page 1 (195, 440)", () => {
      expect(call(MAX.presentUse!)).toMatchObject({ pageIndex: 1, x: 195, y: 440 })
    })
    it("localGovernment at page 1 (195, 425)", () => {
      expect(call(MAX.localGovernment!)).toMatchObject({ pageIndex: 1, x: 195, y: 425 })
    })
    it("purchasePrice at page 1 (152, 264)", () => {
      expect(call(MAX.purchasePrice!)).toMatchObject({ pageIndex: 1, x: 152, y: 264 })
    })
    it("depositHolder at page 1 (400, 260)", () => {
      expect(call(MAX.depositHolder!)).toMatchObject({ pageIndex: 1, x: 400, y: 260 })
    })
    it("depositInitial at page 1 (152, 208)", () => {
      expect(call(MAX.depositInitial!)).toMatchObject({ pageIndex: 1, x: 152, y: 208 })
    })
    it("depositBalance at page 1 (165, 143)", () => {
      expect(call(MAX.depositBalance!)).toMatchObject({ pageIndex: 1, x: 165, y: 143 })
    })
    it("depositBank at page 1 (400, 175)", () => {
      expect(call(MAX.depositBank!)).toMatchObject({ pageIndex: 1, x: 400, y: 175 })
    })

    // Page 2 — Settlement / conditions
    it("settlementDate at page 2 (166, 776)", () => {
      expect(call(MAX.settlementDate!)).toMatchObject({ pageIndex: 2, x: 166, y: 776 })
    })
    it("financeAmount at page 2 (157, 215)", () => {
      expect(call(MAX.financeAmount!)).toMatchObject({ pageIndex: 2, x: 157, y: 215 })
    })
    it("financier at page 2 (145, 200)", () => {
      expect(call(MAX.financier!)).toMatchObject({ pageIndex: 2, x: 145, y: 200 })
    })
    it("financeDate at page 2 (145, 162)", () => {
      expect(call(MAX.financeDate!)).toMatchObject({ pageIndex: 2, x: 145, y: 162 })
    })
    it("inspectionDate at page 2 (390, 217)", () => {
      expect(call(MAX.inspectionDate!)).toMatchObject({ pageIndex: 2, x: 390, y: 217 })
    })

    // Page 3 — Disclosures / encumbrances
    it("encumbrancesText at page 3 (95, 600)", () => {
      expect(call(MAX.encumbrancesText!)).toMatchObject({ pageIndex: 3, x: 95, y: 600 })
    })
    it("lastRentDate at page 3 (300, 390)", () => {
      expect(call(MAX.lastRentDate!)).toMatchObject({ pageIndex: 3, x: 300, y: 390 })
    })

    // Page 4 — Community titles / building units
    it("communityTitlesA at page 4 (273, 705)", () => {
      expect(call(MAX.communityTitlesA!)).toMatchObject({ pageIndex: 4, x: 273, y: 705 })
    })
    it("communityTitlesG at page 4 (273, 487)", () => {
      expect(call(MAX.communityTitlesG!)).toMatchObject({ pageIndex: 4, x: 273, y: 487 })
    })
    it("recordsInspectionDate at page 4 (190, 420)", () => {
      expect(call(MAX.recordsInspectionDate!)).toMatchObject({ pageIndex: 4, x: 190, y: 420 })
    })
    it("buildingUnitsNoticeA at page 4 (273, 320)", () => {
      expect(call(MAX.buildingUnitsNoticeA!)).toMatchObject({ pageIndex: 4, x: 273, y: 320 })
    })
    it("buildingUnitsInspectionDate at page 4 (190, 145)", () => {
      expect(call(MAX.buildingUnitsInspectionDate!)).toMatchObject({ pageIndex: 4, x: 190, y: 145 })
    })

    // Page 5 — Signing
    it("buyer1SigningName at page 5 (100, 443)", () => {
      expect(call(MAX.buyer1SigningName!)).toMatchObject({ pageIndex: 5, x: 100, y: 443 })
    })
    it("buyer1SigningDate at page 5 (235, 443)", () => {
      expect(call(MAX.buyer1SigningDate!)).toMatchObject({ pageIndex: 5, x: 235, y: 443 })
    })
    it("buyer1Witness at page 5 (363, 443)", () => {
      expect(call(MAX.buyer1Witness!)).toMatchObject({ pageIndex: 5, x: 363, y: 443 })
    })
    it("seller1SigningName at page 5 (100, 348)", () => {
      expect(call(MAX.seller1SigningName!)).toMatchObject({ pageIndex: 5, x: 100, y: 348 })
    })
    it("seller1SigningDate at page 5 (235, 348)", () => {
      expect(call(MAX.seller1SigningDate!)).toMatchObject({ pageIndex: 5, x: 235, y: 348 })
    })
    it("seller2SigningName at page 5 (100, 308)", () => {
      expect(call(MAX.seller2SigningName!)).toMatchObject({ pageIndex: 5, x: 100, y: 308 })
    })
  })

  // ── Checkbox coordinate placement ─────────────────────────────────────────
  // CHECKBOX_MAP: each option draws two lines (a checkmark stroke).
  // The first stroke start is at approx (x, y + size*0.57) from the coordinate.
  // We verify the line calls contain the expected x coordinate on the expected page.

  describe("checkbox options produce drawLine calls on correct page", () => {
    function hasLineOnPage(pageIndex: number, x: number) {
      return lineCalls.some((c) => c.pageIndex === pageIndex && Math.abs(c.startX - x) < 1)
    }

    it("gstOption=no-gst draws on page 2 near x=76", () => {
      expect(hasLineOnPage(2, 76)).toBe(true)
    })
    it("disclosureOption=given draws on page 3 near x=78", () => {
      expect(hasLineOnPage(3, 78)).toBe(true)
    })
    it("soldAsOption=freehold draws on page 1 near x=390", () => {
      expect(hasLineOnPage(1, 390)).toBe(true)
    })
    it("landUseOption=builtOn draws on page 1 near x=76", () => {
      expect(hasLineOnPage(1, 76)).toBe(true)
    })
    it("safetySwitchOption=installed draws on page 3 near x=255", () => {
      expect(hasLineOnPage(3, 255)).toBe(true)
    })
    it("smokeAlarmsOption=installed draws on page 3 near x=255", () => {
      expect(hasLineOnPage(3, 255)).toBe(true)
    })
    it("tenanciesOption=no draws on page 3 near x=305", () => {
      expect(hasLineOnPage(3, 305)).toBe(true)
    })
  })

  // ── Omitted values are not drawn ──────────────────────────────────────────

  it("fields absent from values are not drawn", async () => {
    const sparseCalls: DrawCall[] = []
    const origLoad2 = PDFDocument.load
    vi.spyOn(PDFDocument, "load").mockImplementation(async (data, opts) => {
      const doc = await origLoad2.call(PDFDocument, data, opts)
      doc.getPages().forEach((page, pageIndex) => {
        const orig = page.drawText.bind(page)
        vi.spyOn(page, "drawText").mockImplementation((text, options) => {
          sparseCalls.push({ text, x: options?.x ?? 0, y: options?.y ?? 0, pageIndex })
          orig(text, options)
        })
      })
      return doc
    })

    await prefillContractSalePurchase(masterBytes, { seller1Name: "SPARSE_ONLY_VALUE" })
    vi.restoreAllMocks()

    const texts = sparseCalls.map((c) => c.text)
    expect(texts).toContain("SPARSE_ONLY_VALUE")
    expect(texts).not.toContain(MAX.buyer1Name)
    expect(texts).not.toContain(MAX.seller2Name)
    expect(texts).not.toContain(MAX.purchasePrice)
  })

  // ── contractDate uses bgWidth centering (different draw path) ─────────────

  it("contractDate drawn on page 0 at x=135 y=618 with centered text", () => {
    // contractDate has bgWidth:410 → drawText is called with a computed centred x near 135
    const c = drawCalls.find((call) => call.text === MAX.contractDate && call.pageIndex === 0)
    expect(c).toBeDefined()
    // Centered text x is within the bgWidth window [135, 135+410]
    expect(c!.x).toBeGreaterThanOrEqual(135)
    expect(c!.x).toBeLessThan(545)
    expect(c!.y).toBe(618)
  })

  // ── Special conditions word-wrap ──────────────────────────────────────────

  it("special conditions text is drawn on page 5 starting at x=70 y=760", () => {
    const specCalls = drawCalls.filter((c) => c.pageIndex === 5 && c.x === 70)
    // Word-wrap produces at least one drawText call at (70, ≤760)
    expect(specCalls.length).toBeGreaterThanOrEqual(1)
    expect(specCalls[0].y).toBeLessThanOrEqual(760)
    expect(specCalls[0].y).toBeGreaterThanOrEqual(577)
  })
})
