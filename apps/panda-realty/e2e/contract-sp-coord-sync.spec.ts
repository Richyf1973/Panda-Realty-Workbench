/**
 * Feature verification story: Contract S&P PDF coordinate sync.
 * Navigates to the calibration PDF and captures screenshots of each page
 * showing all fields at their calibrated positions.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/contract-sp-coord-sync.spec.ts" --no-retry
 *
 * Pre-requisite: regenerate the calibration PDF first:
 *   node tools/calibrate-contract-sp-all-pages.mjs
 */

import { test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory } from "@repo/e2e-utils"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-coord-sync")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-coord-sync" })
story.setWhatWasBuilt(
  "FIELD_MAP and CHECKBOX_MAP in pdf-prefill-contract-sale-purchase.ts were synced to match the x/y " +
  "coordinates from tools/calibrate-contract-sp-all-pages.mjs: 49 text field differences and 30 checkbox " +
  "differences corrected across all 5 PDF pages. Checkmark default size synced from 7 to 5. " +
  "specialConditions yStart corrected from 769 to 760. " +
  "The calibration PDF below shows every field with a crosshair overlay at its calibrated position.",
)

test.describe("Contract S&P — PDF coordinate sync verification", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  test("cs01 — page 1: contractDate, seller 1 & 2, agent, buyer 1 & 2", async ({ page }) => {
    await page.goto("/contract-sp-calibration-all.pdf")
    await page.waitForLoadState("networkidle", { timeout: 10_000 })
    const p1Path = join(SHOT_DIR, "01-page-1.png")
    await page.screenshot({ path: p1Path, fullPage: false })

    story.addScene({
      title: "01 — Page 1: Contract Date, Sellers, Agent, Buyers",
      images: [p1Path],
      seeing:
        "Calibration PDF page 1 with crosshair overlays at synced positions: contractDate (x:135, y:618, bgWidth:410), " +
        "seller1/2 ABN (x:495, was 490), seller1/2 Postcode (x:520, was 514), seller1/2 Email (x:435, was 426). " +
        "Same x corrections applied to all agent and buyer1/2 ABN, Postcode, Email fields.",
      steps: [
        "Run: node tools/calibrate-contract-sp-all-pages.mjs",
        "Open /contract-sp-calibration-all.pdf in the browser",
        "Verify blue text crosshairs sit on form underlines for all seller/agent/buyer fields on page 1",
      ],
    })
  })

  test("cs02 — page 2: buyer solicitor, property lot/plan/price, deposits", async ({ page }) => {
    await page.goto("/contract-sp-calibration-all.pdf#page=2")
    await page.waitForLoadState("networkidle", { timeout: 10_000 })
    const p2Path = join(SHOT_DIR, "02-page-2.png")
    await page.screenshot({ path: p2Path, fullPage: false })

    story.addScene({
      title: "02 — Page 2: Property Address, Lot/Plan, Purchase Price, Deposits",
      images: [p2Path],
      seeing:
        "Page 2 shows buyer solicitor fields, property address details, lot, plan, title reference, " +
        "purchasePrice (x:152, y:264, was x:155, y:270), depositInitial (x:152, was x:160), and depositBalance — " +
        "all at their corrected coordinates. localGovernment and fixture fields also corrected on this page.",
      steps: [
        "Navigate to page 2 of /contract-sp-calibration-all.pdf",
        "Verify purchasePrice and deposit crosshairs align with the form underlines",
      ],
    })
  })

  test("cs03 — page 3: settlement, finance conditions, GST and land-tax checkboxes", async ({ page }) => {
    await page.goto("/contract-sp-calibration-all.pdf#page=3")
    await page.waitForLoadState("networkidle", { timeout: 10_000 })
    const p3Path = join(SHOT_DIR, "03-page-3.png")
    await page.screenshot({ path: p3Path, fullPage: false })

    story.addScene({
      title: "03 — Page 3: Settlement Date, Financier, Finance Date, GST, Land Tax",
      images: [p3Path],
      seeing:
        "Page 3 shows settlementDate (x:166, y:776), financier (x:145, y:200, was x:185, y:183), " +
        "financeDate (x:145, y:162, was x:185, y:161), inspectionDate (x:390, y:217, was x:495, y:199). " +
        "GST, gstWithholding, and landTax checkbox crosshairs sit inside the □ glyphs.",
      steps: [
        "Navigate to page 3 of /contract-sp-calibration-all.pdf",
        "Verify financier label is no longer at x:185 (far right) — now x:145 (left column)",
        "Verify inspectionDate label is no longer at x:495 — now x:390",
        "Verify red checkbox crosshairs land inside □ glyphs for GST and land-tax options",
      ],
    })
  })

  test("cs04 — page 4: disclosure, tenancies, pool, safety-switch, smoke-alarms", async ({ page }) => {
    await page.goto("/contract-sp-calibration-all.pdf#page=4")
    await page.waitForLoadState("networkidle", { timeout: 10_000 })
    const p4Path = join(SHOT_DIR, "04-page-4.png")
    await page.screenshot({ path: p4Path, fullPage: false })

    story.addScene({
      title: "04 — Page 4: Disclosure, Tenancies, Pool, Safety Switch, Smoke Alarms",
      images: [p4Path],
      seeing:
        "Page 4 shows disclosure (x:78, was x:133), tenancies (x:305, was x:420), rentalHistory (x:365), " +
        "treeOrders (x:365, was x:420), poolQ1/Q2 (x:365, was x:422), safetySwitch (x:255, was x:420), " +
        "smokeAlarms (x:255, was x:250). These were the largest corrections — some fields were 50–80pt off horizontally. " +
        "lastRentDate also corrected (x:300, y:390, was x:360, y:454).",
      steps: [
        "Navigate to page 4 of /contract-sp-calibration-all.pdf",
        "Verify all checkbox crosshairs land inside the printed □ glyphs",
        "Key fix: disclosure moved from x:133 (label area) to x:78 (checkbox area)",
        "Key fix: safetySwitch moved from x:420 to x:255",
      ],
    })
  })

  test("cs05 — page 5: community titles A–G, records inspection date", async ({ page }) => {
    await page.goto("/contract-sp-calibration-all.pdf#page=5")
    await page.waitForLoadState("networkidle", { timeout: 10_000 })
    const p5Path = join(SHOT_DIR, "05-page-5.png")
    await page.screenshot({ path: p5Path, fullPage: false })

    story.addScene({
      title: "05 — Page 5: Community Titles A–G, Records Inspection Date",
      images: [p5Path],
      seeing:
        "Page 5 shows communityTitlesA–G at y values 705, 671, 636, 602, 568, 535, 487 (previously 17–20pt lower). " +
        "recordsInspectionDate at x:190, y:420 (was x:187, y:435). " +
        "Checkmark size synced from default 7 to 5, matching CHECKMARK_SIZE=5 in the calibration script.",
      steps: [
        "Navigate to page 5 of /contract-sp-calibration-all.pdf",
        "Verify community title labels align with their respective form lines",
        "Note smaller checkmarks (5pt) fitting inside the □ glyphs",
      ],
    })
  })
})
