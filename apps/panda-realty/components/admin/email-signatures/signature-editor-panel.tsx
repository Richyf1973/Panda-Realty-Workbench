"use client"

import type React from "react"
import {
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Upload,
} from "lucide-react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"

import { RichEmailEditor, type RichEmailEditorHandle } from "../rich-email-editor"
import type { EmailSignatureForm } from "./types"

export function SignatureEditorPanel({
  selectedId,
  form,
  loading,
  saving,
  listPanelOpen,
  editorLocked,
  errors,
  editorRef,
  onToggleListPanel,
  onStartCreate,
  onSetDefault,
  onNameChange,
  onEditorChange,
  onEditorUploadCountChange,
  onRefresh,
  onSave,
}: {
  selectedId: number | null
  form: EmailSignatureForm
  loading: boolean
  saving: boolean
  listPanelOpen: boolean
  editorLocked: boolean
  errors: Record<string, string>
  editorRef: React.RefObject<RichEmailEditorHandle | null>
  onToggleListPanel: () => void
  onStartCreate: () => void
  onSetDefault: () => void
  onNameChange: (value: string) => void
  onEditorChange: (value: string) => void
  onEditorUploadCountChange: (count: number) => void
  onRefresh: () => void
  onSave: () => void
}) {
  return (
    <section
      className="min-w-0 rounded-xl border bg-background p-4"
      data-testid="email-signatures-editor-panel"
    >
      {loading ? (
        <div
          className="flex min-h-64 items-center justify-center text-muted-foreground"
          data-testid="email-signatures-loading"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading signatures...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3" data-testid="email-signatures-header">
            <div data-testid="email-signatures-title-block">
              <h2 className="font-heading text-lg font-semibold">
                {selectedId == null ? "Create signature" : "Edit signature"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Use the editor for the exact signature HTML that Quick Send will append later.
              </p>
            </div>
            <div
              className="flex flex-wrap items-center justify-end gap-2"
              data-testid="email-signatures-actions"
            >
              <Button
                type="button"
                variant="outline"
                onClick={onToggleListPanel}
                data-testid="email-signatures-list-panel-button"
              >
                {listPanelOpen ? (
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="mr-2 h-4 w-4" />
                )}
                {listPanelOpen ? "Hide signatures" : "Show signatures"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onStartCreate}
                disabled={loading}
                data-testid="email-signatures-create"
              >
                New
              </Button>
              <Button
                type="button"
                variant={form.isDefault ? "default" : "outline"}
                onClick={onSetDefault}
                data-testid="email-signatures-set-default"
              >
                {form.isDefault ? "Office default" : "Set as default"}
              </Button>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email-signature-name">Name</Label>
            <Input
              id="email-signature-name"
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              data-testid="email-signatures-name-input"
            />
            {errors.name ? (
              <p className="text-sm text-destructive" data-testid="email-signatures-name-error">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <RichEmailEditor
                ref={editorRef}
                value={form.htmlContent}
                onChange={onEditorChange}
                disabled={editorLocked}
                label="Editor"
                helpText="Paste images directly into the editor or use Insert image to upload one."
                editorClassName="min-h-[28rem]"
                onUploadCountChange={onEditorUploadCountChange}
                testIds={{
                  editor: "email-signatures-editor",
                  imageInput: "email-signatures-image-input",
                  imageUploadButton: "email-signatures-image-upload",
                  uploadOverlay: "email-signatures-editor-upload-overlay",
                  uploadError: "email-signatures-upload-error",
                  toolbarBold: "email-signatures-editor-toolbar-bold",
                  toolbarItalic: "email-signatures-editor-toolbar-italic",
                  toolbarUnderline: "email-signatures-editor-toolbar-underline",
                  toolbarLink: "email-signatures-editor-toolbar-link",
                  toolbarList: "email-signatures-editor-toolbar-list",
                  toolbarAlignLeft: "email-signatures-editor-toolbar-align-left",
                  toolbarAlignCenter: "email-signatures-editor-toolbar-align-center",
                  toolbarAlignRight: "email-signatures-editor-toolbar-align-right",
                  toolbarFontSize: "email-signatures-editor-font-size",
                  toolbarHighlight: "email-signatures-editor-highlight",
                  toolbarFontColor: "email-signatures-editor-font-color",
                  toolbarFontFamily: "email-signatures-editor-font-family",
                }}
              />

              <div className="space-y-2">
                <Label>Rendered preview</Label>
                <div
                  className="min-h-64 rounded-lg border bg-background p-4 text-sm"
                  data-testid="email-signatures-preview"
                >
                  {form.renderedHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: form.renderedHtml }} />
                  ) : (
                    <p className="text-muted-foreground">
                      The preview updates as you edit the signature.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg border bg-muted/30 p-3 text-sm"
            data-testid="email-signatures-preview-notes"
          >
            <div className="mb-2 font-medium">Preview notes</div>
            <p className="text-muted-foreground">
              This preview reflects the sanitized HTML saved for Panda Realty. Email clients may
              still apply their own rendering quirks later.
            </p>
          </div>

          <div className="flex justify-end gap-2" data-testid="email-signatures-footer-actions">
            <Button type="button" variant="outline" onClick={onRefresh} data-testid="email-signatures-refresh">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={editorLocked}
              data-testid="email-signatures-save"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
