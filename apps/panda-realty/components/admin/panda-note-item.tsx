"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@repo/ui/utils"

export function NoteExpandableText({ note }: { note: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setIsClamped(false)
    setExpanded(false)
    const el = ref.current
    if (!el) return

    // Radix Tabs renders all TabsContent panels in the DOM but marks inactive ones
    // with the HTML `hidden` attribute (display:none), so clientWidth is 0 at mount.
    // We use ResizeObserver to re-run the measurement when the panel becomes visible.
    //
    // Detection strategy: clone the element WITHOUT the line-clamp-4 class (which sets
    // -webkit-line-clamp: 4) and measure its natural height. Modern Chromium applies
    // -webkit-line-clamp regardless of display value, so overriding `display` is not
    // enough — the class must be removed from the clone entirely.
    const measure = () => {
      if (!el.isConnected) return
      const w = el.clientWidth || el.parentElement?.clientWidth || 0
      if (w === 0) return // still hidden — ResizeObserver will retry when visible

      const clone = el.cloneNode(true) as HTMLParagraphElement
      clone.classList.remove("line-clamp-4") // must remove — Chromium applies it even on display:block
      clone.style.cssText =
        `position:fixed;top:-9999px;left:0;visibility:hidden;pointer-events:none;` +
        `display:block;overflow:visible;max-height:none;width:${w}px`
      document.body.appendChild(clone)
      const fullH = clone.clientHeight
      document.body.removeChild(clone)
      const lineH = parseFloat(getComputedStyle(el).lineHeight) || 20
      setIsClamped(fullH > lineH * 4)
      ro.disconnect()
    }

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const raf = requestAnimationFrame(measure)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [note])

  return (
    <>
      <p
        ref={ref}
        className={cn("wrap-break-word text-sm text-foreground", !expanded && "line-clamp-4")}
        data-testid="note-item-text"
      >
        {note}
      </p>
      {isClamped && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-xs text-muted-foreground hover:text-foreground"
          data-testid="note-expand-toggle"
        >
          {expanded ? "Show less ▴" : "Show more ▾"}
        </button>
      )}
    </>
  )
}
