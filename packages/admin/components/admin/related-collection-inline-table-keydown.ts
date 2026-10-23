import type { Table } from "@tanstack/react-table"
import type { MutableRefObject, KeyboardEvent } from "react"

import {
  tryNavigateRelatedInlineTableArrows,
  tryNavigateRelatedInlineTableTab,
} from "../../admin-related-inline-table-arrow-navigation"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"

export interface RelatedInlineTableKeyDownDeps {
  pendingTabFocusTbodyRef: MutableRefObject<HTMLTableSectionElement | null>
  addEmptyRowRef: MutableRefObject<() => void>
  linesRef: MutableRefObject<LineRow[]>
  updateLineRef: MutableRefObject<(clientKey: string, patch: Partial<LineRow>) => void>
  table: Table<LineRow>
}

export function createRelatedInlineTableKeyDownHandler(
  deps: RelatedInlineTableKeyDownDeps,
): (e: KeyboardEvent<HTMLDivElement>) => void {
  return (e) => {
    const tbody = e.currentTarget.querySelector("table tbody")
    if (!(tbody instanceof HTMLTableSectionElement)) return

    if (
      tryNavigateRelatedInlineTableArrows({
        tbody,
        target: e.target,
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
      })
    ) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Tab (forward, no modifiers) — skip action buttons, go to next row's first cell
    if (e.key === "Tab" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const tabResult = tryNavigateRelatedInlineTableTab(tbody)
      if (tabResult.kind === "focusCell") {
        e.preventDefault()
        e.stopPropagation()
        tabResult.target.focus()
        if (
          tabResult.target instanceof HTMLInputElement ||
          tabResult.target instanceof HTMLTextAreaElement
        ) {
          try {
            const len = tabResult.target.value.length
            tabResult.target.setSelectionRange(len, len)
          } catch {
            /* ignore */
          }
        }
      } else if (tabResult.kind === "addRowAndFocusFirst") {
        e.preventDefault()
        e.stopPropagation()
        deps.pendingTabFocusTbodyRef.current = tbody
        deps.addEmptyRowRef.current()
      }
    }

    // Ctrl+; — fill focused cell from the previous row's same column
    if (e.key === ";" && e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const active = document.activeElement
      if (active instanceof HTMLElement && tbody.contains(active)) {
        const tr = active.closest("tr")
        if (tr instanceof HTMLTableRowElement) {
          const allRows = Array.from(
            tbody.querySelectorAll<HTMLTableRowElement>(":scope > tr"),
          )
          const rowIndex = allRows.indexOf(tr)
          if (rowIndex > 0) {
            const td = active.closest("td")
            if (td instanceof HTMLTableCellElement) {
              const tds = Array.from(
                tr.querySelectorAll<HTMLTableCellElement>(":scope > td"),
              )
              const colIndex = tds.indexOf(td)
              const tableRows = deps.table.getRowModel().rows
              const currentTanRow = tableRows[rowIndex]
              if (currentTanRow != null && colIndex >= 0) {
                const cells = currentTanRow.getVisibleCells()
                const cell = cells[colIndex]
                if (cell != null) {
                  const colId = cell.column.id
                  const prevLine = deps.linesRef.current[rowIndex - 1]
                  if (prevLine != null) {
                    const prevValue = prevLine[colId]
                    if (prevValue != null && prevValue !== "") {
                      e.preventDefault()
                      e.stopPropagation()
                      deps.updateLineRef.current(
                        currentTanRow.original.clientKey,
                        { [colId]: prevValue },
                      )
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
