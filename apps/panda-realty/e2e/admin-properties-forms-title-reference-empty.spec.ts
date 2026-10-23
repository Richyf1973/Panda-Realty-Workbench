// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-forms-title-reference-empty.spec.ts --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { PREFILL_DATA_FULL } from "./helpers/panda-form6-mock-data"
import { makeForm6Prefill, openForm6SendDialog } from "./helpers/panda-form6-send-mocks"
import {
  CSP_PREFILL_DATA_FULL,
} from "./helpers/panda-contract-sp-party-fixtures"
import { makeContractSpPrefill, openContractSpSendDialog } from "./helpers/panda-contract-sp-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "title-reference-empty")

const story = createStory({ specUrl: import.meta.url, slug: "title-reference-empty" })

story.setWhatWasBuilt(
  "Form 6 and Contract SP no longer pre-fill the Title Reference field from the rpd column. " +
  "The real title reference requires an external DNRM/titles registry search and must be left empty for the agent to fill in. " +
  "Files changed: form6-prefill.ts (API), contract-sale-purchase-prefill.ts (API), form6-part3-property.tsx (added testid), " +
  "panda-form6-mock-data.ts (PREFILL_DATA_FULL.propertyTitleReference → null), " +
  "panda-contract-sp-party-fixtures.ts (CSP_PREFILL_DATA_FULL.propertyTitleReference → null).",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ─── Form 6 — Title Reference empty ──────────────────────────────────────────

test.describe("Form 6 — Title Reference not pre-filled from rpd", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_DATA_FULL))

  test("Title Reference field is empty on Property tab", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()

    // Stabilise: wait for a field that is always present and pre-filled
    await expect(page.getByTestId("form6-part3-address")).toHaveValue("42 Oak Street", { timeout: 10_000 })

    const titleRef = page.getByTestId("form6-part3-title-reference")
    await expect(titleRef).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, titleRef, SHOT_DIR, "01-form6-title-ref-empty")
    story.addScene({
      title: "01 — Form 6 Property Tab: Title Reference Empty",
      images: [join(SHOT_DIR, "01-form6-title-ref-empty.png")],
      seeing: "Title Reference field is empty — it is not pre-filled from the rpd column (e.g. 116/SP208896).",
      steps: [
        "Open Send Form dialog → 3 Property tab",
        "Observe Title Reference field has no value",
      ],
    })

    await expect(titleRef).toHaveValue("")
  })

})

// ─── Contract SP — Title Reference empty ─────────────────────────────────────

test.describe("Contract SP — Title Reference not pre-filled from rpd", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

  test("Title Reference field is empty on Page 2", async ({ page }) => {
    await openContractSpSendDialog(page)
    await page.getByTestId("contract-sp-tab-trigger--2").click()

    // Stabilise: wait for address field on page 2
    await expect(page.getByTestId("contract-sp-page2-address")).toHaveValue("42 Oak Street", { timeout: 10_000 })

    const titleRef = page.getByTestId("contract-sp-page2-title-reference")
    await expect(titleRef).toBeVisible({ timeout: 5_000 })

    await shotFocused(page, titleRef, SHOT_DIR, "03-contract-sp-title-ref-empty")
    story.addScene({
      title: "03 — Contract SP Page 2: Title Reference Empty",
      images: [join(SHOT_DIR, "03-contract-sp-title-ref-empty.png")],
      seeing: "Title Reference field on Contract SP Page 2 is empty — not pre-filled from rpd.",
      steps: [
        "Open Contract SP Send Form dialog → Page 2 tab",
        "Observe Title Reference field has no value",
      ],
    })

    await expect(titleRef).toHaveValue("")
  })

})
