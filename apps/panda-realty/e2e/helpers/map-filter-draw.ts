import { expect, type Page } from "@playwright/test"

export async function openMapFilterDialog(page: Page) {
  const trigger = page.getByTestId("property-map-filter-trigger")
  const dialog = page.getByTestId("property-map-filter-dialog")
  await expect(trigger).toBeVisible()
  // The list is still hydrating when the toolbar first paints; a click that lands before React
  // attaches the onClick handler is a silent no-op (the dialog never opens). Retry the click until
  // the dialog actually mounts. Opening is idempotent — the trigger always sets open=true.
  await expect(async () => {
    await trigger.click()
    await expect(dialog).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
}

export async function waitForLeafletMap(page: Page) {
  const mapWrap = page.getByTestId("property-map-filter-map-wrap")
  await expect(mapWrap.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 })
  return mapWrap
}

/** Clicks the polygon draw tool, places 3 vertices, double-clicks to close the polygon. */
export async function drawPolygon(page: Page) {
  const mapWrap = page.getByTestId("property-map-filter-map-wrap")
  await mapWrap.locator(".leaflet-draw-draw-polygon").click()

  const leaflet = mapWrap.locator(".leaflet-container")
  const box = await leaflet.boundingBox()
  if (!box) throw new Error("Map container not found")

  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.waitForTimeout(100)
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3)
  await page.waitForTimeout(100)
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.7)
  await page.waitForTimeout(100)
  // Double-click closes the polygon and fires L.Draw.Event.CREATED
  await page.mouse.dblclick(box.x + box.width * 0.5, box.y + box.height * 0.7)
}

/** Clicks the edit-save sequence in the leaflet.draw edit toolbar. */
export async function editAndSavePolygon(page: Page) {
  const mapWrap = page.getByTestId("property-map-filter-map-wrap")
  await mapWrap.locator(".leaflet-draw-edit-edit").click()
  // Save immediately (no vertex drag needed — EDITED event fires on Save)
  await mapWrap.locator(".leaflet-draw-actions a").filter({ hasText: "Save" }).click()
}

/** Clicks the delete tool, clicks the polygon, then saves to clear it. */
export async function deletePolygon(page: Page) {
  const mapWrap = page.getByTestId("property-map-filter-map-wrap")
  await mapWrap.locator(".leaflet-draw-edit-remove").click()
  // Click the drawn polygon to mark it for deletion
  const polygon = mapWrap.locator(".leaflet-interactive")
  await polygon.click()
  await mapWrap.locator(".leaflet-draw-actions a").filter({ hasText: "Save" }).click()
}
