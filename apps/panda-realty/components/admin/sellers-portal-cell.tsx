"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import type { PortalToken } from "./portal-access-panel-base"

interface SellersPortalCellProps {
  propertyListId: number
  initialToken: PortalToken | null
}

type CellState =
  | { kind: "loading" }
  | { kind: "no-token" }
  | { kind: "active"; token: PortalToken }

export function SellersPortalCell({ propertyListId, initialToken }: SellersPortalCellProps) {
  const [state, setCellState] = useState<CellState>(() => {
    if (initialToken && !initialToken.revokedAt) return { kind: "active", token: initialToken }
    return { kind: "no-token" }
  })
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const copyTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  const load = useCallback(async () => {
    setCellState({ kind: "loading" })
    try {
      const res = await fetch(`/api/admin/portal-tokens/seller?propertyListId=${propertyListId}`)
      if (!res.ok) { setCellState({ kind: "no-token" }); return }
      const token = (await res.json()) as PortalToken | null
      if (!token || token.revokedAt) setCellState({ kind: "no-token" })
      else setCellState({ kind: "active", token })
    } catch {
      setCellState({ kind: "no-token" })
    }
  }, [propertyListId])

  useEffect(() => {
    void load()
  }, [load])

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/portal-tokens/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyListId }),
      })
      if (!res.ok) return
      const token = (await res.json()) as PortalToken
      setCellState({ kind: "active", token })
    } finally {
      setGenerating(false)
    }
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/portal/seller/${token}`)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  if (state.kind === "loading") {
    return (
      <div data-testid={`admin-sellers-portal-cell--${propertyListId}`} className="flex items-center">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div data-testid={`admin-sellers-portal-cell--${propertyListId}`} className="flex items-center gap-2">
      {state.kind === "no-token" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          data-testid={`admin-sellers-portal-generate-btn--${propertyListId}`}
          disabled={generating}
          onClick={() => void generate()}
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate link"}
        </Button>
      )}
      {state.kind === "active" && (
        <>
          <span
            data-testid={`admin-sellers-portal-url--${propertyListId}`}
            className="max-w-[160px] truncate font-mono text-xs text-muted-foreground"
          >
            {`/portal/seller/${state.token.token}`}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            data-testid={`admin-sellers-portal-copy-btn--${propertyListId}`}
            onClick={() => void copyLink(state.token.token)}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </>
      )}
    </div>
  )
}
