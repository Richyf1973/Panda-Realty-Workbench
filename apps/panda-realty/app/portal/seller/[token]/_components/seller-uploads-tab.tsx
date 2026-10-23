"use client"

import { PortalUploadsCard } from "@/app/portal/_components/portal-uploads-card"
import type { PortalUploadCardFile } from "@/app/portal/_components/portal-uploads-card"

export type SellerUploadedFile = {
  propertyListFileId: number
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  createdAt: string | null
}

type Props = {
  token: string
  initialFiles: SellerUploadedFile[]
}

export function SellerUploadsTab({ token, initialFiles }: Props) {
  const files: PortalUploadCardFile[] = initialFiles.map((f) => ({
    fileId: f.propertyListFileId,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    createdAt: f.createdAt,
  }))

  return (
    <PortalUploadsCard
      testIdPrefix="portal-seller-uploads"
      initiateUrl={`/api/portal/seller/${token}/files/upload/initiate`}
      recordUrl={`/api/portal/seller/${token}/files/upload/record`}
      fileIdKey="propertyListFileId"
      proxyBase={`/api/portal/seller/${token}/files/property`}
      initialFiles={files}
    />
  )
}
