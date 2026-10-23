/**
 * E2E: Contract S&P — Pages 5–6: strata/community titles and signing fields
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-contract-sp-page-tabs-strata-signing.spec.ts"
 */
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import { CSP_PREFILL_DATA_FULL } from "./helpers/panda-contract-sp-mock-data"
import { makeContractSpPrefill, openContractSpSendDialog } from "./helpers/panda-contract-sp-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-tabs-strata-signing")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-tabs-strata-signing" })
story.setWhatWasBuilt(
  "Contract S&P Pages 5–6: Community Titles items (a)–(g) now show descriptive captions. " +
  "Building Units section expanded from 2 items to 4 (a–d). " +
  "Page 6 adds signing rows for Buyer 1, Buyer 2, Seller 1, and Seller 2.",
)

test.describe("Contract S&P — Pages 5–6: strata and signing", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  test.describe("Page 5 fields", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

    test("Page 5 — community titles (a)–(g) have descriptive captions", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--5").click()
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "06-page5-community-titles-captions")
      story.addScene({
        title: "06 — Page 5: Community Titles descriptive captions",
        images: [join(SHOT_DIR, "06-page5-community-titles-captions.png")],
        seeing: "Community Titles items (a)–(g) now show descriptive captions (e.g. 'Name of body corporate manager') instead of bare letters.",
        steps: ["Open dialog", "Click Page 5 tab"],
      })
      await expect(page.getByTestId("contract-sp-page5-community-titles-caption-a")).toContainText("body corporate manager")
      await expect(page.getByTestId("contract-sp-page5-community-titles-caption-b")).toContainText(/reference|file/i)
      await expect(page.getByTestId("contract-sp-page5-community-titles-caption-g")).toContainText(/arrears/i)
    })

    test("Page 5 — building units section has 4 items (a through d)", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--5").click()
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "07-page5-building-units")
      story.addScene({
        title: "07 — Page 5: Building Units (a)–(d)",
        images: [join(SHOT_DIR, "07-page5-building-units.png")],
        seeing: "Building Units section now shows 4 items (a), (b), (c), (d) instead of the previous 2.",
        steps: ["Open dialog", "Click Page 5 tab", "Scroll to Building Units section"],
      })
      await expect(page.getByTestId("contract-sp-page5-building-units-notice-a")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page5-building-units-notice-b")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page5-building-units-notice-c")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page5-building-units-notice-d")).toBeVisible()
    })

    test("Page 5 — building units inspection date field visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--5").click()
      await expect(page.getByTestId("contract-sp-page5-building-units-inspection-date")).toBeVisible()
    })
  })

  test.describe("Page 6 signing fields", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

    test("Page 6 — buyer 1 signing name, date, witness fields visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--6").click()
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "08-page6-signing")
      story.addScene({
        title: "08 — Page 6: Signing fields",
        images: [join(SHOT_DIR, "08-page6-signing.png")],
        seeing: "Page 6 now includes signing rows for Buyer 1, Buyer 2, Seller 1, Seller 2 each with Name, Date, and Witness fields.",
        steps: ["Open dialog", "Click Page 6 tab"],
      })
      await expect(page.getByTestId("contract-sp-page6-buyer1-signing-name")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-buyer1-signing-date")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-buyer1-witness")).toBeVisible()
    })

    test("Page 6 — buyer 2 signing name, date, witness fields visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--6").click()
      await expect(page.getByTestId("contract-sp-page6-buyer2-signing-name")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-buyer2-signing-date")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-buyer2-witness")).toBeVisible()
    })

    test("Page 6 — seller 1 signing name, date, witness fields visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--6").click()
      await expect(page.getByTestId("contract-sp-page6-seller1-signing-name")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-seller1-signing-date")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-seller1-witness")).toBeVisible()
    })

    test("Page 6 — seller 2 signing name, date, witness fields visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--6").click()
      await expect(page.getByTestId("contract-sp-page6-seller2-signing-name")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-seller2-signing-date")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page6-seller2-witness")).toBeVisible()
    })
  })
})
