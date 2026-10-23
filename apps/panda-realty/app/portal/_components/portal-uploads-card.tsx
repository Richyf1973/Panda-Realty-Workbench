"use client"

import { useId, useState } from "react"
import { Download, ExternalLink, FileText, Loader2, Upload } from "lucide-react"

import { DriveUploadError, DriveUploadProgress } from "@/components/admin/drive-upload-feedback"
import { useDriveUpload } from "@/lib/use-drive-upload"

export type PortalUploadCardFile = {
  fileId: number
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  createdAt: string | null
}

type Props = {
  testIdPrefix: string
  initiateUrl: string
  recordUrl: string
  fileIdKey: string
  proxyBase: string
  initialFiles: PortalUploadCardFile[]
}

export function PortalUploadsCard({
  testIdPrefix,
  initiateUrl,
  recordUrl,
  fileIdKey,
  proxyBase,
  initialFiles,
}: Props) {
  const [files, setFiles] = useState<PortalUploadCardFile[]>(initialFiles)
  const fileInputId = useId()

  const { uploading, uploadPercent, uploadingFileName, uploadError, retryFile, handleFileInput, handleRetry } =
    useDriveUpload({
      initiateUrl,
      recordUrl,
      onRecordSuccess: async (data) => {
        setFiles((prev) => [
          ...prev,
          {
            fileId: data[fileIdKey] as number,
            fileName: (data.fileName as string | null) ?? null,
            fileType: (data.fileType as string | null) ?? null,
            fileSize: (data.fileSize as number | null) ?? null,
            createdAt: (data.createdAt as string | null) ?? null,
          },
        ])
      },
    })

  return (
    <div data-testid={testIdPrefix} className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Your Uploads</h2>

      {files.length === 0 ? (
        <p data-testid={`${testIdPrefix}-empty`} className="mb-4 text-sm text-gray-500">
          No files uploaded yet.
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {files.map((file) => {
            const proxyUrl = `${proxyBase}/${file.fileId}`
            return (
              <li
                key={file.fileId}
                data-testid={`${testIdPrefix}-row`}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <FileText className="size-5 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {file.fileName ?? "Untitled file"}
                  </p>
                  {file.fileType && (
                    <p className="text-xs text-gray-500">{file.fileType}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={proxyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`${testIdPrefix}-view`}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <ExternalLink className="size-3.5" />
                    View
                  </a>
                  <a
                    href={`${proxyUrl}?download=1`}
                    data-testid={`${testIdPrefix}-download`}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {uploading && (
        <div className="mb-4">
          <DriveUploadProgress
            uploadPercent={uploadPercent}
            uploadingFileName={uploadingFileName}
            testId={`${testIdPrefix}-progress`}
          />
        </div>
      )}

      {uploadError && (
        <div className="mb-4">
          <DriveUploadError
            uploadError={uploadError}
            retryFile={retryFile}
            onRetry={handleRetry}
            testId={`${testIdPrefix}-error`}
          />
        </div>
      )}

      <input
        id={fileInputId}
        type="file"
        multiple
        className="sr-only"
        aria-label="Upload a file"
        onChange={handleFileInput}
        disabled={uploading}
      />
      {!uploading ? (
        <label
          htmlFor={fileInputId}
          data-testid={`${testIdPrefix}-btn`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Upload className="size-4" />
          Upload a file
        </label>
      ) : (
        <span
          data-testid={`${testIdPrefix}-btn`}
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-green-600/60 px-4 py-2 text-sm font-medium text-white"
        >
          <Loader2 className="size-4 animate-spin" />
          Uploading…
        </span>
      )}
    </div>
  )
}
