"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  NO_SIGNATURE_VALUE,
  persistSelectedSignature,
  rememberedExplicitSignatureIdInSession,
  rememberedSignatureIdInSession,
  SIGNATURE_STORAGE_KEY,
} from "./gmail-compose-session"
import {
  plainTextToRichEmailHtml,
  removeComposeSignatureHtml,
  upsertComposeSignatureHtml,
} from "./rich-email-editor-html"
import { type ComposeSignature } from "./gmail-compose-signature-select"

export function useGmailComposeSignatureState({
  open,
  initialBody,
  setEditorHtml,
}: {
  open: boolean
  initialBody: string
  setEditorHtml: React.Dispatch<React.SetStateAction<string>>
}) {
  const [signatures, setSignatures] = useState<ComposeSignature[]>([])
  const [selectedSignatureId, setSelectedSignatureId] = useState<number | null>(null)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [loadingSignatures, setLoadingSignatures] = useState(false)
  const signatureSelectionTouchedRef = useRef(false)

  const selectedSignature = useMemo(
    () => signatures.find((signature) => signature.id === selectedSignatureId) ?? null,
    [selectedSignatureId, signatures],
  )
  const explicitSessionSignature = useMemo(
    () =>
      rememberedExplicitSignatureIdInSession == null
        ? null
        : signatures.find((signature) => signature.id === rememberedExplicitSignatureIdInSession) ??
          null,
    [signatures],
  )
  const effectiveSelectedSignature = useMemo(
    () => selectedSignature ?? (signatures.find((signature) => signature.isDefault) ?? signatures[0] ?? null),
    [selectedSignature, signatures],
  )
  const displayedSelectedSignature = explicitSessionSignature ?? effectiveSelectedSignature
  const selectedSignatureValue =
    displayedSelectedSignature == null ? NO_SIGNATURE_VALUE : String(displayedSelectedSignature.id)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoadingSignatures(true)

    void fetch("/api/admin/email-signatures")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { items?: ComposeSignature[] }
        if (cancelled) return

        const nextSignatures = data.items ?? []
        setSignatures(nextSignatures)

        if (signatureSelectionTouchedRef.current) return

        const stored =
          typeof window !== "undefined" ? window.localStorage.getItem(SIGNATURE_STORAGE_KEY) : null
        const preferredStoredId =
          rememberedExplicitSignatureIdInSession != null &&
          nextSignatures.some((signature) => signature.id === rememberedExplicitSignatureIdInSession)
            ? String(rememberedExplicitSignatureIdInSession)
            : stored != null &&
                nextSignatures.some((signature) => String(signature.id) === stored)
              ? stored
              : null
        const officeDefault = nextSignatures.find((signature) => signature.isDefault)
        const fallbackSignature = officeDefault ?? nextSignatures[0] ?? null
        const nextSelectedSignature =
          preferredStoredId == null
            ? fallbackSignature
            : nextSignatures.find((signature) => String(signature.id) === preferredStoredId) ??
              fallbackSignature ??
              null

        setSelectedSignatureId(nextSelectedSignature?.id ?? null)
        persistSelectedSignature(
          nextSelectedSignature == null
            ? NO_SIGNATURE_VALUE
            : String(nextSelectedSignature.id),
        )
        setIncludeSignature(nextSelectedSignature != null)
        setEditorHtml((current) => {
          const nextBaseHtml = current || plainTextToRichEmailHtml(initialBody)
          return nextSelectedSignature
            ? upsertComposeSignatureHtml(nextBaseHtml, nextSelectedSignature.renderedHtml)
            : removeComposeSignatureHtml(nextBaseHtml)
        })
      })
      .catch(() => {
        if (cancelled) return
        setSignatures([])
        setSelectedSignatureId(null)
        setIncludeSignature(false)
        setEditorHtml((current) =>
          removeComposeSignatureHtml(current || plainTextToRichEmailHtml(initialBody)),
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingSignatures(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, initialBody, setEditorHtml])

  useEffect(() => {
    if (!open) return
    if (selectedSignatureId != null || effectiveSelectedSignature == null) return
    setSelectedSignatureId(effectiveSelectedSignature.id)
  }, [effectiveSelectedSignature, open, selectedSignatureId])

  return {
    signatures,
    selectedSignatureId,
    setSelectedSignatureId,
    includeSignature,
    setIncludeSignature,
    loadingSignatures,
    signatureSelectionTouchedRef,
    selectedSignature,
    effectiveSelectedSignature,
    displayedSelectedSignature,
    selectedSignatureValue,
  }
}
