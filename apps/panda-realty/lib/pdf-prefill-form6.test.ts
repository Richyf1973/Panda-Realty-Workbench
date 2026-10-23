// Run: npm run test -w panda-realty -- --reporter=verbose
import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"

import { prefillForm6 } from "./pdf-prefill-form6"

const COMMISSION_FIELD =
  "The client and the agent agree that the commission including GST payable for the service to be performed by the agent is:"

const SELLER_NAME_FIELD = "Client name_1"

async function minimalAcroFormPdf(fieldNames: string[]): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage()
  const form = doc.getForm()
  for (const name of fieldNames) {
    const field = form.createTextField(name)
    field.addToPage(page, { x: 50, y: 700, width: 400, height: 30 })
  }
  const bytes = await doc.save()
  return bytes.buffer as ArrayBuffer
}

function extractFontSize(da: string | undefined): number {
  if (!da) return 0
  const m = da.match(/(\d+(?:\.\d+)?)\s+Tf/)
  return m ? parseFloat(m[1]) : 0
}

describe("prefillForm6 — font sizes", () => {
  it("runtime commissionFontSize overrides the static FIELD_FONT_SIZE default", async () => {
    const master = await minimalAcroFormPdf([COMMISSION_FIELD])
    const filled = await prefillForm6(master, { commission: "1.95% + gst", commissionFontSize: "9" })
    const doc = await PDFDocument.load(filled)
    const da = doc.getForm().getTextField(COMMISSION_FIELD).acroField.getDefaultAppearance()
    expect(extractFontSize(da)).toBe(9)
  })

  it("runtime advertisingTextFontSize overrides the static default", async () => {
    const ADVERTISING_FIELD =
      "The client authorises the agent to incur the following expenses in relation to the performance of the service/s. Annexures may be attached if required"
    const master = await minimalAcroFormPdf([ADVERTISING_FIELD])
    const filled = await prefillForm6(master, {
      advertisingText: "Domain + REA package",
      advertisingTextFontSize: "8",
    })
    const doc = await PDFDocument.load(filled)
    const da = doc.getForm().getTextField(ADVERTISING_FIELD).acroField.getDefaultAppearance()
    expect(extractFontSize(da)).toBe(8)
  })


  it("commission field DA encodes 10pt after prefill", async () => {
    const master = await minimalAcroFormPdf([COMMISSION_FIELD])
    const filled = await prefillForm6(master, { commission: "1.95% + gst" })
    const doc = await PDFDocument.load(filled)
    const da = doc.getForm().getTextField(COMMISSION_FIELD).acroField.getDefaultAppearance()
    expect(extractFontSize(da)).toBe(10)
  })

  it("non-commission text field (seller1Name) DA also encodes 10pt", async () => {
    const master = await minimalAcroFormPdf([SELLER_NAME_FIELD])
    const filled = await prefillForm6(master, { seller1Name: "John Smith" })
    const doc = await PDFDocument.load(filled)
    const da = doc.getForm().getTextField(SELLER_NAME_FIELD).acroField.getDefaultAppearance()
    expect(extractFontSize(da)).toBe(10)
  })

  it("empty commission value skips setText — other fields still render at 10pt without error", async () => {
    const master = await minimalAcroFormPdf([COMMISSION_FIELD, SELLER_NAME_FIELD])
    const filled = await prefillForm6(master, { seller1Name: "Jane Doe" })
    const doc = await PDFDocument.load(filled)
    const da = doc.getForm().getTextField(SELLER_NAME_FIELD).acroField.getDefaultAppearance()
    expect(extractFontSize(da)).toBe(10)
  })
})
