import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export interface ProFormaPrefillValues {
  propertyAddress?: string
  // Buyer details
  buyer1Name?: string
  buyer2Name?: string
  buyerAddress?: string
  buyerPhone?: string
  buyerEmail?: string
  // Offer
  offerAmount?: string
  settlementPeriod?: string
  // Cash buyer radio (value "Yes" or "No")
  cashBuyer?: string
  // Subject to sale of another property
  subjectToSaleYes?: boolean
  subjectToSaleNo?: boolean
  subjectToSale7Days?: boolean
  subjectToSale14Days?: boolean
  salePropertyToBeListedYes?: boolean
  salePropertyOnTheMarket?: boolean
  salePropertyUnderContract?: boolean
  salePropertyUnconditional?: boolean
  saleSettlementDate?: string
  // Subject to finance
  subjectToFinanceYes?: boolean
  subjectToFinanceNo?: boolean
  financePreApprovedYes?: boolean
  financePreApprovedNo?: boolean
  financeDaysToApprove?: string
  financeBank?: string
  financeBankPhone?: string
  // Solicitor
  solicitorName?: string
  solicitorPhone?: string
  solicitorAddress?: string
  solicitorEmail?: string
}

type TextField = keyof Pick<
  ProFormaPrefillValues,
  | "buyer1Name" | "buyer2Name" | "buyerAddress" | "buyerPhone" | "buyerEmail"
  | "offerAmount" | "settlementPeriod"
  | "saleSettlementDate"
  | "financeDaysToApprove" | "financeBank" | "financeBankPhone"
  | "solicitorName" | "solicitorPhone" | "solicitorAddress" | "solicitorEmail"
>

const TEXT_FIELD_MAP: Record<TextField, string> = {
  buyer1Name: "Full names As on licence Buyer 1",
  buyer2Name: "Buyer 2",
  buyerAddress: "Address",
  buyerPhone: "Phone",
  buyerEmail: "Email",
  offerAmount: "Offer Amount",
  settlementPeriod: "What is your preferred Settlement period or date",
  saleSettlementDate: "What is the settlement date of your property",
  financeDaysToApprove: "How many days do you require to get fully approved from bank",
  financeBank: "Which bank or finance company will you be using",
  financeBankPhone: "Ph",
  solicitorName: "Solicitors Name",
  solicitorPhone: "Solicitors Phone",
  solicitorAddress: "Solicitors Address",
  solicitorEmail: "Solicitors Email",
}

type CheckboxField = keyof Pick<
  ProFormaPrefillValues,
  | "subjectToSaleYes" | "subjectToSaleNo"
  | "subjectToSale7Days" | "subjectToSale14Days"
  | "salePropertyToBeListedYes" | "salePropertyOnTheMarket"
  | "salePropertyUnderContract" | "salePropertyUnconditional"
  | "subjectToFinanceYes" | "subjectToFinanceNo"
  | "financePreApprovedYes" | "financePreApprovedNo"
>

const CHECKBOX_FIELD_MAP: Record<CheckboxField, string> = {
  subjectToSaleYes: "Will this offer be subject to the Sale of another property Yes",
  subjectToSaleNo: "No_2",
  subjectToSale7Days: "7 Days",
  subjectToSale14Days: "14 Days",
  salePropertyToBeListedYes: "If so is it To be Listed",
  salePropertyOnTheMarket: "On the Market",
  salePropertyUnderContract: "Under Contract",
  salePropertyUnconditional: "Unconditional",
  subjectToFinanceYes: "Is this offer Subject to Finance Yes",
  subjectToFinanceNo: "No_4",
  financePreApprovedYes: "Yes_2",
  financePreApprovedNo: "No_3",
}

// Coordinate-based overlay for "Property Address:" — not an AcroForm field
const PROPERTY_ADDRESS_X = 185
const PROPERTY_ADDRESS_Y = 748

export async function prefillProFormaContract2026(
  masterPdfBytes: ArrayBuffer,
  values: ProFormaPrefillValues,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(masterPdfBytes)
  const form = pdfDoc.getForm()

  for (const [valueKey, fieldName] of Object.entries(TEXT_FIELD_MAP)) {
    const value = values[valueKey as TextField]
    if (!value) continue
    try {
      const field = form.getTextField(fieldName)
      field.setText(value)
    } catch {
      // Field not found — skip silently rather than aborting
    }
  }

  for (const [valueKey, fieldName] of Object.entries(CHECKBOX_FIELD_MAP)) {
    const checked = values[valueKey as CheckboxField]
    if (!checked) continue
    try {
      const field = form.getCheckBox(fieldName)
      field.check()
    } catch {
      // Field not found — skip silently
    }
  }

  if (values.cashBuyer) {
    try {
      const radioGroup = form.getRadioGroup("Cash buyer")
      radioGroup.select(values.cashBuyer)
    } catch {
      // Radio group not found — skip silently
    }
  }

  if (values.propertyAddress) {
    const page = pdfDoc.getPages()[0]
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    page.drawText(values.propertyAddress, {
      x: PROPERTY_ADDRESS_X,
      y: PROPERTY_ADDRESS_Y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    })
  }

  return pdfDoc.save({ updateFieldAppearances: true })
}
