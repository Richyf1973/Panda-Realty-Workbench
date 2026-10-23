import "server-only"

import {
  downloadFileFromDrive,
  getOrCreateDriveFolder,
  shareFilePublicly,
  uploadFileToDrive,
} from "@/lib/google-drive-client"

export async function fillPdfBytes(
  strategy: string,
  masterBytes: ArrayBuffer,
  prefillValues: Record<string, string | undefined>,
): Promise<Uint8Array> {
  if (strategy === "form-6") {
    const { prefillForm6 } = await import("@/lib/pdf-prefill-form6")
    return prefillForm6(masterBytes, prefillValues as import("@/lib/pdf-prefill-form6").Form6PrefillValues)
  }
  if (strategy === "contract-sale-purchase-1") {
    const { prefillContractSalePurchase } = await import("@/lib/pdf-prefill-contract-sale-purchase")
    return prefillContractSalePurchase(masterBytes, prefillValues as import("@/lib/pdf-prefill-contract-sale-purchase").ContractSalePurchasePrefillValues)
  }
  const { prefillProFormaContract2026 } = await import("@/lib/pdf-prefill-proforma-2026")
  return prefillProFormaContract2026(masterBytes, prefillValues as import("@/lib/pdf-prefill-proforma-2026").ProFormaPrefillValues)
}

export async function fillAndUploadToDrive(
  form: { prefillStrategy: string | null; googleDriveFileId: string | null; formName: string },
  property: { streetAddress: string | null; suburb: string | null; propertyListId: number },
  prefillValues: Record<string, string | undefined>,
  driveToken: string,
): Promise<{ fileId: string; webViewLink: string; fileName: string }> {
  const masterBytes = await downloadFileFromDrive(driveToken, form.googleDriveFileId!)
  const filledBytes = await fillPdfBytes(form.prefillStrategy!, masterBytes, prefillValues)

  const propertyLabel = [property.streetAddress, property.suburb].filter(Boolean).join(", ")
  const date = new Date().toISOString().slice(0, 10)
  const fileName = `${form.formName}${propertyLabel ? ` — ${propertyLabel}` : ""} [prefilled ${date}].pdf`

  const folderId = await getOrCreateDriveFolder(driveToken, `Property Offers / ${property.propertyListId}`)
  const { fileId, webViewLink } = await uploadFileToDrive(
    driveToken,
    filledBytes.buffer as ArrayBuffer,
    fileName,
    "application/pdf",
  )
  const moveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&fields=id`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${driveToken}`, "Content-Type": "application/json" },
      body: "{}",
    },
  )
  if (!moveRes.ok) {
    console.warn("[pdf-fill-and-upload] Drive folder move failed", await moveRes.text())
  }
  await shareFilePublicly(driveToken, fileId)
  return { fileId, webViewLink, fileName }
}
