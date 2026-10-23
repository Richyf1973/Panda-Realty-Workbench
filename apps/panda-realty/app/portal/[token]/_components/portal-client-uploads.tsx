"use client"

import { PortalUploadsCard } from "@/app/portal/_components/portal-uploads-card"
import type { PortalUploadCardFile } from "@/app/portal/_components/portal-uploads-card"

export type PortalUploadedFile = {
  propertyEntityFileId: number
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  createdAt: string | null
}

type Props = {
  token: string
  initialFiles: PortalUploadedFile[]
}

export function PortalClientUploads({ token, initialFiles }: Props) {
  const files: PortalUploadCardFile[] = initialFiles.map((f) => ({
    fileId: f.propertyEntityFileId,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    createdAt: f.createdAt,
  }))

  return (
    <PortalUploadsCard
      testIdPrefix="portal-client-uploads"
      initiateUrl={`/api/portal/${token}/files/upload/initiate`}
      recordUrl={`/api/portal/${token}/files/upload/record`}
      fileIdKey="propertyEntityFileId"
      proxyBase={`/api/portal/${token}/files/entity`}
      initialFiles={files}
    />
  )
}
