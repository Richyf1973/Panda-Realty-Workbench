"use client"

import { useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, Loader2, RefreshCw, Upload, XCircle } from "lucide-react"

import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"
import type { AdminEntityCrudFormSubscribeApi } from "@repo/admin/admin-entity-crud-form-subscribe-api"
import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Switch } from "@repo/ui/switch"

import { clientDriveResumableUpload } from "@/lib/client-drive-resumable-upload"

type FormLike = AdminEntityCrudFormSubscribeApi & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Field: React.ComponentType<any>
}

export function PropertyFormsCreateDialogBody({ form: formArg }: AdminRenderCrudDialogFormBodyArgs) {
  if (formArg == null) return null
  const form = formArg as unknown as FormLike

  const fileInputId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [retryFile, setRetryFile] = useState<File | null>(null)

  useLayoutEffect(() => {
    const el = bodyRef.current?.closest("[data-slot='dialog-content']") as HTMLElement | null
    setPortalHost(el ?? document.body)
  }, [])

  async function runUpload(file: File) {
    setUploading(true)
    setUploadPercent(0)
    setUploadedName(null)
    setUploadError(null)
    setRetryFile(null)
    form.setFieldValue("fileLink", "")
    form.setFieldValue("fileName", "")
    form.setFieldValue("fileSize", "")
    form.setFieldValue("googleDriveFileId", "")

    const { error } = await clientDriveResumableUpload({
      file,
      initiateUrl: "/api/admin/property-forms/initiate-upload",
      recordUrl: "/api/admin/property-forms/finalize-upload",
      onProgress: (percent) => setUploadPercent(percent),
      onRecordSuccess: async (data) => {
        const meta = data as {
          googleDriveFileId: string
          fileLink: string
          fileName: string
          fileSize: number
        }
        form.setFieldValue("fileLink", meta.fileLink)
        form.setFieldValue("fileName", meta.fileName)
        form.setFieldValue("fileSize", String(meta.fileSize))
        form.setFieldValue("googleDriveFileId", meta.googleDriveFileId)
        setUploadedName(meta.fileName)
      },
    })

    setUploading(false)
    if (error) {
      setUploadError(error)
      setRetryFile(file)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    await runUpload(file)
  }

  function handleRetry() {
    if (retryFile) void runUpload(retryFile)
  }

  return (
    <div
      ref={bodyRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy"
      data-testid="property-forms-create-dialog-body"
    >
      {portalHost &&
        createPortal(
          <input
            id={fileInputId}
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />,
          portalHost,
        )}

      <div className="space-y-4 px-4 py-3">
        <form.Field name="formName">
          {(field: { state: { value: string }; handleChange: (v: string) => void }) => (
            <div className="grid gap-1.5">
              <Label htmlFor="pf-create-form-name">
                Form Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pf-create-form-name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-testid="admin-entity-create-field--property-forms--formName"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="category">
          {(field: { state: { value: string }; handleChange: (v: string) => void }) => (
            <div className="grid gap-1.5">
              <Label htmlFor="pf-create-category">Category</Label>
              <Input
                id="pf-create-category"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-testid="admin-entity-create-field--property-forms--category"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field: { state: { value: string }; handleChange: (v: string) => void }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="pf-create-is-active"
                checked={field.state.value !== "false"}
                onCheckedChange={(v) => field.handleChange(v ? "true" : "false")}
                data-testid="admin-entity-create-field--property-forms--isActive"
              />
              <Label htmlFor="pf-create-is-active">Active</Label>
            </div>
          )}
        </form.Field>

        <form.Field name="description">
          {(field: { state: { value: string }; handleChange: (v: string) => void }) => (
            <div className="grid gap-1.5">
              <Label htmlFor="pf-create-description">Description</Label>
              <Input
                id="pf-create-description"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="off"
                data-testid="admin-entity-create-field--property-forms--description"
              />
            </div>
          )}
        </form.Field>

        <div className="grid gap-1.5">
          <Label>
            Upload to Google Drive <span className="text-destructive">*</span>
          </Label>
          <label
            htmlFor={fileInputId}
            className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/60 ${uploading ? "pointer-events-none opacity-50" : ""}`}
            data-testid="property-forms-create-upload-btn"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose file
              </>
            )}
          </label>

          {uploading && (
            <div className="flex flex-col gap-1" data-testid="property-forms-create-upload-progress">
              <p className="text-xs text-muted-foreground">{uploadPercent}%</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {uploadedName && !uploading && (
            <p
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
              data-testid="property-forms-create-upload-success"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              {uploadedName}
            </p>
          )}

          {uploadError && (
            <div
              className="flex items-center gap-2"
              data-testid="property-forms-create-upload-error"
            >
              <p className="flex flex-1 items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </p>
              {retryFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  data-testid="property-forms-create-upload-retry"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
