"use client"

import { useState } from "react"

import { takeFilesFromFileInputAndReset } from "@/lib/file-input-take-files"
import { clientDriveResumableUpload } from "@/lib/client-drive-resumable-upload"

interface UseDriveUploadOptions {
  initiateUrl: string
  initiateExtraFields?: Record<string, string | number>
  recordUrl: string
  recordExtraFields?: Record<string, string | number>
  onRecordSuccess: (data: Record<string, unknown>) => Promise<void>
}

export interface UseDriveUploadReturn {
  uploading: boolean
  uploadPercent: number
  uploadingFileName: string | null
  uploadError: string | null
  /** Non-null when the file was saved but Google Drive sharing failed; the file may not be publicly accessible. */
  shareWarning: string | null
  retryFile: File | null
  /** Wire to an `<input type="file">` onChange. Handles multi-file and stop-on-error. */
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRetry: () => void
}

export function useDriveUpload({
  initiateUrl,
  initiateExtraFields,
  recordUrl,
  recordExtraFields,
  onRecordSuccess,
}: UseDriveUploadOptions): UseDriveUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [shareWarning, setShareWarning] = useState<string | null>(null)
  const [retryFile, setRetryFile] = useState<File | null>(null)

  /** Returns true when the upload failed so multi-file loops can break early. */
  async function runUpload(file: File): Promise<boolean> {
    setUploading(true)
    setUploadPercent(0)
    setUploadingFileName(file.name)
    setUploadError(null)
    setShareWarning(null)
    setRetryFile(null)

    const { error, shareWarning: warning } = await clientDriveResumableUpload({
      file,
      initiateUrl,
      initiateExtraFields,
      recordUrl,
      recordExtraFields,
      onProgress: (percent) => setUploadPercent(percent),
      onRecordSuccess,
    })

    setUploading(false)
    setUploadingFileName(null)
    if (error) {
      setUploadError(error)
      setRetryFile(file)
      return true
    }
    if (warning) setShareWarning(warning)
    return false
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = takeFilesFromFileInputAndReset(e.target)
    if (files.length === 0) return
    void (async () => {
      for (const file of files) {
        const failed = await runUpload(file)
        if (failed) break
      }
    })()
  }

  function handleRetry() {
    if (retryFile) void runUpload(retryFile)
  }

  return {
    uploading,
    uploadPercent,
    uploadingFileName,
    uploadError,
    shareWarning,
    retryFile,
    handleFileInput,
    handleRetry,
  }
}
