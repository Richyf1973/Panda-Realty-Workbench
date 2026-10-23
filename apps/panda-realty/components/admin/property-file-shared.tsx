"use client"

import { File, FileImage, FileSpreadsheet, FileText } from "lucide-react"

export { PROPERTY_ADMIN_FILE_UPLOAD_MAX_BYTES } from "@/lib/property-file-upload-constants"

export function formatPropertyFileBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PropertyFileIcon({ mimeType }: { mimeType: string | null }) {
  const cls = "h-8 w-8 shrink-0 text-muted-foreground"
  if (!mimeType) return <File className={cls} />
  if (mimeType.startsWith("image/")) return <FileImage className={cls} />
  if (mimeType === "application/pdf" || mimeType.startsWith("text/"))
    return <FileText className={cls} />
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return <FileSpreadsheet className={cls} />
  return <FileText className={cls} />
}
