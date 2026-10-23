"use client"

import { useCallback, useLayoutEffect, useRef, type UIEvent } from "react"

export type EntityDataTableFooterSync = {
  bodyScrollRef: React.RefObject<HTMLDivElement | null>
  footerScrollRef: React.RefObject<HTMLDivElement | null>
  bodyTableRef: React.RefObject<HTMLTableElement | null>
  footerTableRef: React.RefObject<HTMLTableElement | null>
  onBodyScroll: (e: UIEvent<HTMLDivElement>) => void
  onFooterScroll: (e: UIEvent<HTMLDivElement>) => void
}

export function useEntityDataTableFooterSync(
  dock: boolean,
  bodyRowCount: number,
): EntityDataTableFooterSync {
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const footerScrollRef = useRef<HTMLDivElement>(null)
  const bodyTableRef = useRef<HTMLTableElement>(null)
  const footerTableRef = useRef<HTMLTableElement>(null)
  const syncingScrollRef = useRef(false)

  const syncFooterWidthsFromHeader = useCallback(() => {
    const bodyTable = bodyTableRef.current
    const footerTable = footerTableRef.current
    if (!bodyTable || !footerTable) return
    const ths = bodyTable.querySelectorAll<HTMLTableCellElement>("thead th")
    const ftds =
      footerTable.querySelectorAll<HTMLTableCellElement>("tfoot td")
    if (ths.length === 0 || ftds.length === 0) return

    const bodyRows = bodyTable.querySelectorAll<HTMLTableRowElement>("tbody tr")
    let thIdx = 0
    ftds.forEach((ftd) => {
      const span = Math.max(1, ftd.colSpan || 1)
      if (thIdx + span > ths.length) return

      let maxW = 0
      for (let s = 0; s < span; s++) {
        const th = ths[thIdx + s]
        if (th) maxW += th.offsetWidth
      }
      bodyRows.forEach((tr) => {
        const cells = tr.querySelectorAll<HTMLTableCellElement>("td")
        let rowW = 0
        for (let s = 0; s < span; s++) {
          const td = cells[thIdx + s]
          if (td) rowW += td.offsetWidth
        }
        maxW = Math.max(maxW, rowW)
      })

      /* minWidth aligns with body; omit width/maxWidth so totals (often wider than row cells) stay one line */
      ftd.style.minWidth = `${maxW}px`
      ftd.style.width = ""
      ftd.style.maxWidth = ""

      thIdx += span
    })
  }, [])

  useLayoutEffect(() => {
    if (!dock) return
    const runSync = () => {
      syncFooterWidthsFromHeader()
      requestAnimationFrame(syncFooterWidthsFromHeader)
    }
    runSync()
    const scrollEl = bodyScrollRef.current
    const tableEl = bodyTableRef.current
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      runSync()
    })
    if (scrollEl) ro.observe(scrollEl)
    if (tableEl) ro.observe(tableEl)
    return () => ro.disconnect()
  }, [dock, syncFooterWidthsFromHeader, bodyRowCount])

  const onBodyScroll = useCallback(
    (_e: UIEvent<HTMLDivElement>) => {
      if (!dock) return
      const b = bodyScrollRef.current
      const f = footerScrollRef.current
      if (!b || !f || syncingScrollRef.current) return
      syncingScrollRef.current = true
      f.scrollLeft = b.scrollLeft
      syncingScrollRef.current = false
    },
    [dock],
  )

  const onFooterScroll = useCallback(
    (_e: UIEvent<HTMLDivElement>) => {
      if (!dock) return
      const b = bodyScrollRef.current
      const f = footerScrollRef.current
      if (!b || !f || syncingScrollRef.current) return
      syncingScrollRef.current = true
      b.scrollLeft = f.scrollLeft
      syncingScrollRef.current = false
    },
    [dock],
  )

  return {
    bodyScrollRef,
    footerScrollRef,
    bodyTableRef,
    footerTableRef,
    onBodyScroll,
    onFooterScroll,
  }
}
