import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { pandaProperties, propertyForms } from "@/db/schema"
import { getDriveAccessToken, getOrCreateDriveFolder, shareFilePublicly, uploadFileToDrive } from "@/lib/google-drive-client"
import { downloadFileFromDrive } from "@/lib/google-drive-files"
import { prefillProFormaContract2026 } from "@/lib/pdf-prefill-proforma-2026"
import type { SubmitData } from "@/app/api/offer-form/[token]/offer-form-upsert"

export async function generateAndUploadOfferFormPdf(
  propertyListId: number,
  data: SubmitData,
): Promise<string | null> {
  const [form] = await db
    .select({ googleDriveFileId: propertyForms.googleDriveFileId, formName: propertyForms.formName })
    .from(propertyForms)
    .where(eq(propertyForms.prefillStrategy, "pro-forma-2026"))
    .limit(1)

  if (!form?.googleDriveFileId) return null

  const [property] = await db
    .select({ streetAddress: pandaProperties.streetAddress, suburb: pandaProperties.suburb })
    .from(pandaProperties)
    .where(eq(pandaProperties.propertyListId, propertyListId))
    .limit(1)

  let accessToken: string
  try {
    accessToken = await getDriveAccessToken()
  } catch {
    return null
  }

  const buyer1 = data.buyers[0]
  const buyer2 = data.buyers[1]

  const masterBytes = await downloadFileFromDrive(accessToken, form.googleDriveFileId)
  const filledBytes = await prefillProFormaContract2026(masterBytes, {
    buyer1Name: buyer1?.name,
    buyer2Name: buyer2?.name,
    buyerAddress: buyer1?.address,
    buyerPhone: buyer1?.phone,
    buyerEmail: buyer1?.email,
    offerAmount: data.offerAmount,
    settlementPeriod: data.settlementPeriod,
    cashBuyer: data.cashBuyer,
    subjectToSaleYes: data.subjectToSale === true,
    subjectToSaleNo: data.subjectToSale === false,
    subjectToFinanceYes: data.subjectToFinance === true,
    subjectToFinanceNo: data.subjectToFinance === false,
    financePreApprovedYes: data.financePreApproved === true,
    financePreApprovedNo: data.financePreApproved === false,
    financeDaysToApprove: data.financeApprovalDays,
    financeBank: data.financeBank,
    financeBankPhone: data.financeBankContactPhone,
    solicitorName: data.solicitorName,
    solicitorPhone: data.solicitorPhone,
    solicitorAddress: data.solicitorAddress,
    solicitorEmail: data.solicitorEmail,
    saleSettlementDate: data.saleBuyerSettlementDate,
    salePropertyToBeListedYes: data.saleStatus === "to_be_listed",
    salePropertyOnTheMarket: data.saleStatus === "on_the_market",
    salePropertyUnderContract: data.saleStatus === "under_contract",
    salePropertyUnconditional: data.saleIsUnconditional === true,
  })

  const propertyLabel = property
    ? [property.streetAddress, property.suburb].filter(Boolean).join(", ")
    : String(propertyListId)
  const date = new Date().toISOString().slice(0, 10)
  const formName = form.formName ?? "Pro Forma Contract 2026"
  const fileName = `${formName}${propertyLabel ? ` — ${propertyLabel}` : ""} [prefilled ${date}].pdf`

  const folderId = await getOrCreateDriveFolder(accessToken, `Property Offers / ${propertyListId}`)
  const { fileId, webViewLink } = await uploadFileToDrive(
    accessToken,
    filledBytes.buffer as ArrayBuffer,
    fileName,
    "application/pdf",
    folderId,
  )
  await shareFilePublicly(accessToken, fileId)

  return webViewLink
}
