/**
 * E2E: Contract S&P — 6-tab structure, navigation, and persistence
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-contract-sp-page-tabs-structure.spec.ts"
 */
import { type Page, expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { setupCommonRoutes } from "./helpers/panda-contract-sp-send-mocks"
import { routePandaPropertiesListDetailAndBuyerOffers } from "./helpers/panda-properties-dialog-mocks"
import { CSP_PREFILL_DATA_FULL, EMPTY_ENTITIES } from "./helpers/panda-contract-sp-mock-data"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-tabs-structure")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-tabs-structure" })
story.setWhatWasBuilt(
  "Contract S&P fill-step restructured from 8 logical tabs to 6 PDF-page-mirrored tabs (Page 1–Page 6). " +
  "Verifies tab count, labels, all-tab navigation without crash, and value persistence across tab switches.",
)

test.describe("Contract S&P — 6-page tab structure and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CSP_PREFILL_DATA_FULL) })
    })
    await page.route("**/api/admin/property-forms/template**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ templateValues: null }) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) }))
    await page.route("**/api/admin/properties/1001/contacts**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) }))
    await page.route("**/api/admin/properties/1001/tenants**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) }))
    await signInAsAdmin(page)
  })

  test.afterAll(() => {
    story.write()
  })

  async function openDialog(page: Page) {
    await routePandaPropertiesListDetailAndBuyerOffers(page)
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 15_000 })
    await page.getByTestId("panda-properties-form-tab-trigger--forms").click()
    await expect(page.getByTestId("panda-properties-form-tab--forms")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("property-forms-send--4").click()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("contract-sp-fill-step")).toBeVisible({ timeout: 15_000 })
  }

  test("dialog shows exactly 6 tab triggers labeled Page 1 through Page 6", async ({ page }) => {
    await openDialog(page)
    const fill = page.getByTestId("contract-sp-fill-step")
    await expect(fill).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, fill, SHOT_DIR, "01-tab-structure")
    story.addScene({
      title: "01 — Tab structure: 6 PDF-mirrored pages",
      images: [join(SHOT_DIR, "01-tab-structure.png")],
      seeing: "Fill step with 6 tabs labeled Page 1 through Page 6.",
      steps: ["Open Contract S&P send dialog", "Observe 6 tab triggers"],
    })

    for (let i = 1; i <= 6; i++) {
      const trigger = page.getByTestId(`contract-sp-tab-trigger--${i}`)
      await expect(trigger).toBeVisible()
      await expect(trigger).toContainText(`Page ${i}`)
    }
    await expect(page.getByTestId("contract-sp-tab-trigger--7")).not.toBeVisible()
    await expect(page.getByTestId("contract-sp-tab-trigger--8")).not.toBeVisible()
  })

  test("all 6 tabs navigable without crash and tab 6 has signing section", async ({ page }) => {
    await openDialog(page)
    for (let i = 1; i <= 6; i++) {
      await page.getByTestId(`contract-sp-tab-trigger--${i}`).click()
      await expect(page.getByTestId("contract-sp-fill-step")).toBeVisible()
      await expect(page.getByTestId(`contract-sp-tab-trigger--${i}`)).toContainText(`Page ${i}`)
    }
    await expect(page.getByTestId("contract-sp-page6-buyer1-signing-name")).toBeVisible({ timeout: 10_000 })
  })

  test("values typed on Page 1 survive switching to Page 6 and back", async ({ page }) => {
    await openDialog(page)
    await expect(page.getByTestId("contract-sp-page1-seller1-name")).toBeVisible({ timeout: 10_000 })
    await page.getByTestId("contract-sp-page1-seller1-name").fill("Persistence Seller")
    await page.getByTestId("contract-sp-tab-trigger--6").click()
    await page.getByTestId("contract-sp-tab-trigger--1").click()
    await expect(page.getByTestId("contract-sp-page1-seller1-name")).toHaveValue("Persistence Seller")
  })
})
