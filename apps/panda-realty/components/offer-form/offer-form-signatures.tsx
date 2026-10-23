"use client"

import { useEffect, useRef, useState } from "react"

import type { BuyerCard, SignatureEntry } from "./offer-form-types"

const SIGNATURE_FONTS = ["Dancing Script", "Great Vibes", "Sacramento", "Caveat", "Brush Script MT"]

interface SignaturePadProps {
  index: number
  entry: SignatureEntry
  onChange: (entry: SignatureEntry) => void
  error?: string
}

function SignaturePad({ index, entry, onChange, error }: SignaturePadProps) {
  const n = index + 1
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [typedName, setTypedName] = useState(entry.method === "type" ? entry.data : "")

  const fontFamily = `'${SIGNATURE_FONTS[index % SIGNATURE_FONTS.length]}', cursive, sans-serif`

  useEffect(() => {
    if (entry.method === "type") setTypedName(entry.data)
  }, [entry.data, entry.method])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 1.0
    ctx.lineCap = "round"
  }, [])

  function getCoords(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function eraseCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function clearCanvas() {
    eraseCanvas()
    onChange({ ...entry, data: "" })
  }

  function switchMode(mode: "draw" | "type") {
    eraseCanvas()
    setTypedName("")
    onChange({ ...entry, method: mode, data: "" })
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 1.0
    ctx.lineCap = "round"
    drawingRef.current = true
    const coords = getCoords(e.nativeEvent, canvas)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    e.preventDefault()
  }

  function moveDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const coords = getCoords(e.nativeEvent, canvas)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    e.preventDefault()
  }

  function endDraw() {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) onChange({ ...entry, data: canvas.toDataURL() })
  }

  function handleTypedName(val: string) {
    setTypedName(val)
    onChange({ ...entry, data: val })
  }

  const isDraw = entry.method === "draw"

  return (
    <div
      className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-4 transition-all"
      data-testid={`offer-form-signature-${n}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Purchaser {n} Execution Signature
        </label>
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => switchMode("type")}
            className={`rounded px-2 py-1 font-medium transition ${!isDraw ? "bg-slate-900 text-white" : "text-gray-600"}`}
            data-testid={`offer-form-signature-${n}-type-btn`}
          >
            Type Text
          </button>
          <button
            type="button"
            onClick={() => switchMode("draw")}
            className={`rounded px-2 py-1 font-medium transition ${isDraw ? "bg-slate-900 text-white" : "text-gray-600"}`}
            data-testid={`offer-form-signature-${n}-draw-btn`}
          >
            Draw Canvas
          </button>
        </div>
      </div>

      {isDraw && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              className="h-24 w-full touch-none cursor-crosshair"
              width={400}
              height={96}
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
              data-testid={`offer-form-signature-${n}-canvas`}
            />
            <button
              type="button"
              onClick={clearCanvas}
              className="absolute right-2 top-1 rounded border bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 transition hover:text-slate-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {!isDraw && (
        <div className="space-y-2">
          <input
            type="text"
            value={typedName}
            onChange={(e) => handleTypedName(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-slate-500 focus:ring-slate-500"
            placeholder="Type your formal complete legal identity name..."
            data-testid={`offer-form-signature-${n}-text-input`}
          />
          <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white px-4 shadow-inner">
            <p
              className="w-full select-none truncate text-center text-3xl text-slate-800"
              style={{ fontFamily }}
            >
              {typedName}
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-600" data-testid={`offer-form-signature-${n}-date`}>
        Attestation Record Date: {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      {error && (
        <p className="mt-1 text-xs text-red-500" data-testid={`offer-form-signature-${n}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

interface OfferFormSignaturesProps {
  buyers: BuyerCard[]
  signatures: SignatureEntry[]
  setSignatures: (v: SignatureEntry[]) => void
  signatureErrors?: string[]
}

export function OfferFormSignatures({ buyers, signatures, setSignatures, signatureErrors }: OfferFormSignaturesProps) {
  function updateSignature(index: number, entry: SignatureEntry) {
    const next = [...signatures]
    next[index] = entry
    setSignatures(next)
  }

  return (
    <div
      className={`grid grid-cols-1 gap-6 ${buyers.length > 1 ? "md:grid-cols-2" : ""}`}
      data-testid="offer-form-signatures-container"
    >
      {buyers.map((buyer, i) => (
        <SignaturePad
          key={buyer.id}
          index={i}
          entry={signatures[i] ?? { buyerId: buyer.id, buyerName: buyer.name, data: "", method: "type" as const, signDate: "" }}
          onChange={(entry) => updateSignature(i, entry)}
          error={signatureErrors?.[i]}
        />
      ))}
    </div>
  )
}
