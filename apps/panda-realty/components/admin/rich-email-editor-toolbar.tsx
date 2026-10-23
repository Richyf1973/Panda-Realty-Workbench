"use client"

import { useRef, useState } from "react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  Underline,
} from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"

import { ToolbarButton } from "./email-signatures/toolbar-button"
import {
  FONT_COLOR_OPTIONS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  HIGHLIGHT_OPTIONS,
} from "./rich-email-editor-options"

export interface RichEmailEditorTestIds {
  editor: string
  imageInput: string
  imageUploadButton?: string
  uploadOverlay?: string
  uploadError?: string
  toolbarBold: string
  toolbarItalic: string
  toolbarUnderline: string
  toolbarLink: string
  toolbarList: string
  toolbarAlignLeft: string
  toolbarAlignCenter: string
  toolbarAlignRight: string
  toolbarFontSize: string
  toolbarHighlight: string
  toolbarFontColor: string
  toolbarFontFamily: string
}

interface RichEmailEditorToolbarProps {
  disabled: boolean
  testIds: RichEmailEditorTestIds
  hideImageUpload?: boolean
  onUploadFile: (file: File) => Promise<void>
  applyInlineStyle: (
    styleProperty: "font-size" | "background-color" | "color" | "font-family",
    styleValue: string | null,
  ) => void
  runEditorCommand: (command: string, commandValue?: string) => void
}

export function RichEmailEditorToolbar({
  disabled,
  testIds,
  hideImageUpload = false,
  onUploadFile,
  applyInlineStyle,
  runEditorCommand,
}: RichEmailEditorToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [fontSizeControlValue, setFontSizeControlValue] = useState("")
  const [highlightControlValue, setHighlightControlValue] = useState("")
  const [fontColorControlValue, setFontColorControlValue] = useState("")
  const [fontFamilyControlValue, setFontFamilyControlValue] = useState("")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToolbarButton
        onClick={() => runEditorCommand("bold")}
        disabled={disabled}
        testId={testIds.toolbarBold}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => runEditorCommand("italic")}
        disabled={disabled}
        testId={testIds.toolbarItalic}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => runEditorCommand("underline")}
        disabled={disabled}
        testId={testIds.toolbarUnderline}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          const url = window.prompt("Enter link URL")
          if (!url) return
          runEditorCommand("createLink", url)
        }}
        disabled={disabled}
        testId={testIds.toolbarLink}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => runEditorCommand("insertUnorderedList")}
        disabled={disabled}
        testId={testIds.toolbarList}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => runEditorCommand("justifyLeft")}
        disabled={disabled}
        testId={testIds.toolbarAlignLeft}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => runEditorCommand("justifyCenter")}
        disabled={disabled}
        testId={testIds.toolbarAlignCenter}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => runEditorCommand("justifyRight")}
        disabled={disabled}
        testId={testIds.toolbarAlignRight}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <Select
        value={fontSizeControlValue}
        onValueChange={(value) => {
          setFontSizeControlValue("")
          applyInlineStyle("font-size", value === "default" ? null : value)
        }}
      >
        <SelectTrigger
          aria-label="Font size"
          disabled={disabled}
          data-testid={testIds.toolbarFontSize}
          size="lg"
        >
          <SelectValue placeholder="Font size" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          {FONT_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={highlightControlValue}
        onValueChange={(value) => {
          setHighlightControlValue("")
          applyInlineStyle("background-color", value === "none" ? null : value)
        }}
      >
        <SelectTrigger
          aria-label="Highlight"
          disabled={disabled}
          data-testid={testIds.toolbarHighlight}
          size="lg"
        >
          <SelectValue placeholder="Highlight" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          {HIGHLIGHT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {option.value !== "none" && (
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border/40"
                    style={{ backgroundColor: option.value }}
                  />
                )}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={fontColorControlValue}
        onValueChange={(value) => {
          setFontColorControlValue("")
          applyInlineStyle("color", value === "default" ? null : value)
        }}
      >
        <SelectTrigger
          aria-label="Font color"
          disabled={disabled}
          data-testid={testIds.toolbarFontColor}
          size="lg"
        >
          <SelectValue placeholder="Font color" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          {FONT_COLOR_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {option.value !== "default" && (
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm border border-border/40"
                    style={{ backgroundColor: option.value }}
                  />
                )}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={fontFamilyControlValue}
        onValueChange={(value) => {
          setFontFamilyControlValue("")
          applyInlineStyle("font-family", value === "default" ? null : value)
        }}
      >
        <SelectTrigger
          aria-label="Font style"
          disabled={disabled}
          data-testid={testIds.toolbarFontFamily}
          size="lg"
        >
          <SelectValue placeholder="Font style" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4}>
          {FONT_FAMILY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!hideImageUpload && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            data-testid={testIds.imageUploadButton}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            Insert image
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid={testIds.imageInput}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              if (file) {
                void onUploadFile(file)
              }
              event.target.value = ""
            }}
          />
        </>
      )}
    </div>
  )
}
