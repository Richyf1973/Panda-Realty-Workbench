/**
 * Pipeline Kanban – drag-and-drop regression
 *
 * Covers: card drag to a different column stays visible after drop (no disappearing).
 * Regression for: revalidatePath in move actions causing router refresh that reset
 * client useState, wiping the optimistic update.
 *
 * Uses live DB (DATABASE_URL required) so the move server action runs for real.
 *
 * NOTE: dnd-kit uses PointerSensor, so drags must use pointer events, not mouse events.
 */

import { expect, test, type Page } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
  PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET,
  sellersCardByAddressSnippet,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

/**
 * Drag via pointer events — required for dnd-kit PointerSensor.
 * activationConstraint is distance: 8, so we move 10px before heading to dest.
 */
async function dragTo(
  page: Page,
  sourceX: number,
  sourceY: number,
  destX: number,
  destY: number,
) {
  await page.mouse.move(sourceX, sourceY)
  // Dispatch pointerdown so dnd-kit sees it
  await page.evaluate(
    ({ sx, sy }) => {
      const el = document.elementFromPoint(sx, sy)
      if (!el) return
      el.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: sx,
          clientY: sy,
          pointerId: 1,
          isPrimary: true,
        }),
      )
    },
    { sx: sourceX, sy: sourceY },
  )

  // Move past activation threshold (distance 8) first
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = sourceX + (destX - sourceX) * t
    const y = sourceY + (destY - sourceY) * t
    await page.evaluate(
      ({ cx, cy }) => {
        document.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: cx,
            clientY: cy,
            pointerId: 1,
            isPrimary: true,
          }),
        )
      },
      { cx: x, cy: y },
    )
    // Small delay so React batching can process
    if (i % 5 === 0) await page.waitForTimeout(16)
  }

  // pointerup at destination
  await page.evaluate(
    ({ dx, dy }) => {
      document.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          clientX: dx,
          clientY: dy,
          pointerId: 1,
          isPrimary: true,
        }),
      )
    },
    { dx: destX, dy: destY },
  )
}

test.describe("Pipeline Kanban drag-and-drop", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await signInAsAdmin(page)
  })

  test("sellers pipeline: dragged card stays in destination column", async ({ page }) => {
    await page.goto("/admin/pipeline?pipeline=sellers")
    await page.waitForLoadState("networkidle")

    // Find all columns (data-testid="kanban-column--{CODE}")
    const columns = page.locator('[data-testid^="kanban-column--"]')
    await expect(columns.first()).toBeVisible({ timeout: 15_000 })

    await expect(
      sellersCardByAddressSnippet(page, PANDA_PIPELINE_SEED_CARD_ADDRESS_SNIPPET).first(),
    ).toBeVisible({ timeout: 20_000 })

    const columnCount = await columns.count()
    expect(columnCount).toBeGreaterThanOrEqual(2)

    // Find the first column that has at least one card (seed ensures ≥1)
    let sourceColumnIdx = -1
    let sourceCard: ReturnType<typeof page.locator> | null = null

    for (let i = 0; i < columnCount; i++) {
      const col = columns.nth(i)
      const cards = col.locator('[data-testid^="kanban-card--"]')
      const cardCount = await cards.count()
      if (cardCount > 0) {
        sourceColumnIdx = i
        sourceCard = cards.first()
        break
      }
    }

    expect(sourceColumnIdx).toBeGreaterThanOrEqual(0)
    expect(sourceCard).not.toBeNull()
    const card = sourceCard!

    // Destination: a different column
    const destColumnIdx = sourceColumnIdx === columnCount - 1
      ? sourceColumnIdx - 1
      : sourceColumnIdx + 1
    const destColumn = columns.nth(destColumnIdx)

    const sourceCardTestId = await card.getAttribute("data-testid")
    const destColumnTestId = await destColumn.getAttribute("data-testid")
    const sourceColumnTestId = await columns.nth(sourceColumnIdx).getAttribute("data-testid")
    expect(sourceCardTestId).toBeTruthy()
    expect(destColumnTestId).toBeTruthy()

    const sourceBox = await card.boundingBox()
    const destBox = await destColumn.boundingBox()
    expect(sourceBox).toBeTruthy()
    expect(destBox).toBeTruthy()

    await dragTo(
      page,
      sourceBox!.x + sourceBox!.width / 2,
      sourceBox!.y + sourceBox!.height / 2,
      destBox!.x + destBox!.width / 2,
      destBox!.y + destBox!.height / 2,
    )

    // 1. Card should appear in the destination column immediately (optimistic update)
    await expect(
      page.locator(`[data-testid="${destColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).toBeVisible({ timeout: 5_000 })

    // 2. Card must NOT disappear after server action + any router activity settles
    await page.waitForTimeout(3_000)
    await expect(
      page.locator(`[data-testid="${destColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).toBeVisible({ timeout: 5_000 })

    // 3. Card must NOT be in the source column anymore
    await expect(
      page.locator(`[data-testid="${sourceColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).not.toBeVisible()

    // 4. Reload and verify DB was updated — card persists in destination column
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(
      page.locator(`[data-testid="${destColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).toBeVisible({ timeout: 10_000 })

    // Restore: drag back to original column so the test is non-destructive
    const cardAfterReload = page.locator(`[data-testid="${sourceCardTestId}"]`)
    const srcColAfterReload = page.locator(`[data-testid="${sourceColumnTestId}"]`)
    const cardBox2 = await cardAfterReload.boundingBox()
    const srcColBox2 = await srcColAfterReload.boundingBox()
    if (cardBox2 && srcColBox2) {
      await dragTo(
        page,
        cardBox2.x + cardBox2.width / 2,
        cardBox2.y + cardBox2.height / 2,
        srcColBox2.x + srcColBox2.width / 2,
        srcColBox2.y + srcColBox2.height / 2,
      )
      await page.waitForTimeout(2_000)
    }
  })

  test("buyers pipeline: dragged card stays in destination column", async ({ page }) => {
    await page.goto("/admin/pipeline?pipeline=buyers")
    await page.waitForLoadState("networkidle")

    const columns = page.locator('[data-testid^="kanban-column--"]')
    await expect(columns.first()).toBeVisible({ timeout: 15_000 })

    await expect(
      buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET).first(),
    ).toBeVisible({ timeout: 20_000 })

    const columnCount = await columns.count()
    expect(columnCount).toBeGreaterThanOrEqual(2)

    let sourceColumnIdx = -1
    let sourceCard: ReturnType<typeof page.locator> | null = null

    for (let i = 0; i < columnCount; i++) {
      const col = columns.nth(i)
      const cards = col.locator('[data-testid^="kanban-buyer-card--"]')
      const cardCount = await cards.count()
      if (cardCount > 0) {
        sourceColumnIdx = i
        sourceCard = cards.first()
        break
      }
    }

    expect(sourceColumnIdx).toBeGreaterThanOrEqual(0)
    expect(sourceCard).not.toBeNull()
    const card = sourceCard!

    const destColumnIdx = sourceColumnIdx === columnCount - 1
      ? sourceColumnIdx - 1
      : sourceColumnIdx + 1
    const destColumn = columns.nth(destColumnIdx)

    const sourceCardTestId = await card.getAttribute("data-testid")
    const destColumnTestId = await destColumn.getAttribute("data-testid")
    const sourceColumnTestId = await columns.nth(sourceColumnIdx).getAttribute("data-testid")
    expect(sourceCardTestId).toBeTruthy()
    expect(destColumnTestId).toBeTruthy()

    const sourceBox = await card.boundingBox()
    const destBox = await destColumn.boundingBox()
    expect(sourceBox).toBeTruthy()
    expect(destBox).toBeTruthy()

    await dragTo(
      page,
      sourceBox!.x + sourceBox!.width / 2,
      sourceBox!.y + sourceBox!.height / 2,
      destBox!.x + destBox!.width / 2,
      destBox!.y + destBox!.height / 2,
    )

    await expect(
      page.locator(`[data-testid="${destColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).toBeVisible({ timeout: 5_000 })

    await page.waitForTimeout(3_000)
    await expect(
      page.locator(`[data-testid="${destColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).toBeVisible({ timeout: 5_000 })

    await expect(
      page.locator(`[data-testid="${sourceColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).not.toBeVisible()

    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(
      page.locator(`[data-testid="${destColumnTestId}"] [data-testid="${sourceCardTestId}"]`),
    ).toBeVisible({ timeout: 10_000 })

    // Restore
    const cardAfterReload = page.locator(`[data-testid="${sourceCardTestId}"]`)
    const srcColAfterReload = page.locator(`[data-testid="${sourceColumnTestId}"]`)
    const cardBox2 = await cardAfterReload.boundingBox()
    const srcColBox2 = await srcColAfterReload.boundingBox()
    if (cardBox2 && srcColBox2) {
      await dragTo(
        page,
        cardBox2.x + cardBox2.width / 2,
        cardBox2.y + cardBox2.height / 2,
        srcColBox2.x + srcColBox2.width / 2,
        srcColBox2.y + srcColBox2.height / 2,
      )
      await page.waitForTimeout(2_000)
    }
  })
})
