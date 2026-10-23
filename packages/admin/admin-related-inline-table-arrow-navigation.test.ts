import { describe, expect, it } from "vitest"

import { relatedInlineTableArrowNeighborCoords } from "./admin-related-inline-table-arrow-navigation"

describe("relatedInlineTableArrowNeighborCoords", () => {
  const a = { k: 1 }
  const b = { k: 2 }
  const c = { k: 3 }
  const d = { k: 4 }
  const grid: (typeof a | null)[][] = [
    [a, null, b],
    [null, c, null],
  ]

  it("moves right skipping empty cells", () => {
    expect(
      relatedInlineTableArrowNeighborCoords(grid, 0, 0, "ArrowRight"),
    ).toEqual({ row: 0, col: 2 })
  })

  it("moves left to previous filled cell", () => {
    expect(
      relatedInlineTableArrowNeighborCoords(grid, 0, 2, "ArrowLeft"),
    ).toEqual({ row: 0, col: 0 })
  })

  it("moves down in same column when that cell is filled", () => {
    const aligned: (typeof a | null)[][] = [
      [a, b],
      [c, d],
    ]
    expect(
      relatedInlineTableArrowNeighborCoords(aligned, 0, 1, "ArrowDown"),
    ).toEqual({ row: 1, col: 1 })
  })

  it("moves up in same column when that cell is filled", () => {
    const aligned: (typeof a | null)[][] = [
      [a, b],
      [c, d],
    ]
    expect(
      relatedInlineTableArrowNeighborCoords(aligned, 1, 1, "ArrowUp"),
    ).toEqual({ row: 0, col: 1 })
  })

  it("returns null at grid edge", () => {
    expect(
      relatedInlineTableArrowNeighborCoords(grid, 0, 0, "ArrowLeft"),
    ).toBeNull()
    expect(
      relatedInlineTableArrowNeighborCoords(grid, 0, 2, "ArrowRight"),
    ).toBeNull()
    expect(
      relatedInlineTableArrowNeighborCoords(grid, 0, 2, "ArrowDown"),
    ).toBeNull()
    expect(
      relatedInlineTableArrowNeighborCoords(grid, 1, 1, "ArrowDown"),
    ).toBeNull()
  })
})
