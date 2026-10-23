import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

const scratchDir = join(dirname(fileURLToPath(import.meta.url)), ".scratch")
const sideRailPng = join(scratchDir, "entities-buyer-statuses-side-rail-fullhd.png")
const mainScrollPng = join(scratchDir, "entities-edit-main-column-scroll-fullhd.png")
const dialogPng = join(scratchDir, "entities-edit-dialog-fullhd.png")

/**
 * Run alone (fast): `npx playwright test apps/panda-realty/e2e/admin-entities-side-rail-scrollbar.spec.ts --config=apps/panda-realty/playwright.config.ts`
 *
 * Writes PNGs under e2e/.scratch/ for visual review (scrollbar visibility depends on data + dialog height).
 */
test("full HD screenshots — entities edit dialog buyer form side rail", async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  test.skip(
    !e2ePandaAdminListApiConfigured,
    "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example)",
  )

  mkdirSync(scratchDir, { recursive: true })

  await signInAsAdmin(page)
  await page.setViewportSize({ width: 1920, height: 1080 })

  await page.goto(
    "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
  )
  await page.waitForLoadState("networkidle")

  await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
  await expect(page.getByTestId("admin-entity-crud-dialog--entities")).toBeVisible()
  await expect(page.getByTestId("panda-entities-buyer-tabs")).toBeVisible({
    timeout: 30_000,
  })

  const dialog = page.getByTestId("admin-entity-crud-dialog--entities")
  await dialog.screenshot({ path: dialogPng })

  const mainScroll = page.getByTestId("admin-entity-crud-side-rail-main-scroll--entities")
  await expect(mainScroll).toBeVisible()
  await mainScroll.screenshot({ path: mainScrollPng })

  const sideRail = page.getByTestId("admin-entity-crud-after-main-fields-side-rail--entities")
  await expect(sideRail).toBeVisible()
  await sideRail.screenshot({ path: sideRailPng })

  const mainMetrics = await mainScroll.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }))
  test.info().attach("main-column-scroll-metrics.json", {
    body: Buffer.from(JSON.stringify(mainMetrics, null, 2)),
    contentType: "application/json",
  })
  expect(mainMetrics.overflowY === "auto" || mainMetrics.overflowY === "scroll").toBe(true)
  expect(mainMetrics.scrollHeight).toBeGreaterThan(mainMetrics.clientHeight)

  const scrollRegion = page.getByTestId(
    "admin-entity-crud-after-main-fields-side-rail-scroll--entities",
  )
  const metrics = await scrollRegion.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY,
  }))
  test.info().attach("side-rail-scroll-metrics.json", {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  })

  expect(metrics.overflowY === "auto" || metrics.overflowY === "scroll").toBe(true)
})
