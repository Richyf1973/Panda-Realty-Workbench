import { Download, ExternalLink, FileText } from "lucide-react"

import { PortalSignDocumentButton } from "./portal-sign-document-button"

export type PortalDocumentItem = {
  fileId: number
  kind: "property" | "entity"
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  createdAt: Date | null
  googleDriveFileId: string | null
  signatureStatus: string | null
  signedAt: string | null
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date | null): string {
  if (!date) return ""
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function formatSignedAt(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

export function PortalDocuments({
  token,
  documents,
  proxyBase: proxyBaseOverride,
}: {
  token: string
  documents: PortalDocumentItem[]
  proxyBase?: string
}) {
  const base = proxyBaseOverride ?? `/api/portal/${token}/files`
  return (
    <div data-testid="portal-documents" className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Documents</h2>
      {documents.length === 0 ? (
        <p
          data-testid="portal-documents-empty"
          className="text-sm text-gray-500"
        >
          No documents have been shared yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => {
            const proxyBase = `${base}/${doc.kind}/${doc.fileId}`
            const size = formatFileSize(doc.fileSize)
            const added = formatDate(doc.createdAt)
            const driveId = doc.googleDriveFileId
            const rowTestId = driveId
              ? `portal-document-row--${driveId}`
              : `portal-document-row--${doc.kind}-${doc.fileId}`

            return (
              <li
                key={`${doc.kind}-${doc.fileId}`}
                data-testid={rowTestId}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <FileText className="size-5 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {doc.fileName ?? "Untitled file"}
                  </p>
                  <p className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {doc.fileType && <span>{doc.fileType}</span>}
                    {size && <span data-testid="portal-document-size">{size}</span>}
                    {added && (
                      <span data-testid="portal-document-date">Added {added}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <a
                    href={proxyBase}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="portal-document-view"
                    className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <ExternalLink className="size-3.5" />
                    View
                  </a>
                  <a
                    href={`${proxyBase}?download=1`}
                    data-testid="portal-document-download"
                    className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <Download className="size-3.5" />
                    Download
                  </a>
                  {doc.signatureStatus === "pending" && driveId && (
                    <>
                      <span
                        data-testid={`portal-sign-required-badge--${driveId}`}
                        className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                      >
                        Sign required
                      </span>
                      <PortalSignDocumentButton token={token} driveFileId={driveId} fileName={doc.fileName} />
                    </>
                  )}
                  {doc.signatureStatus === "signed" && driveId && (
                    <span
                      data-testid={`portal-signed-badge--${driveId}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-700"
                    >
                      ✅ Signed
                      {doc.signedAt && (
                        <span data-testid={`portal-signed-at--${driveId}`}>
                          · {formatSignedAt(doc.signedAt)}
                        </span>
                      )}
                    </span>
                  )}
                  {doc.signatureStatus === "cancelled" && (
                    <span
                      data-testid={driveId ? `portal-signing-cancelled--${driveId}` : undefined}
                      className="text-xs text-red-600"
                    >
                      ❌ Signing cancelled — contact your agent
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
