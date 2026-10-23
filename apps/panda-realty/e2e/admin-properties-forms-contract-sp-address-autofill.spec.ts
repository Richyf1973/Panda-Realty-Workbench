/**
 * E2E: Contract S&P — Address auto-fill suburb/state/postcode
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-contract-sp-address-autofill.spec.ts" --no-bail
 */
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import {
  CSP_PREFILL_DATA_SELLER_SUBURB_FALLBACK,
  CSP_PREFILL_DATA_SELLER_WITH_SUBURB,
} from "./helpers/panda-contract-sp-mock-data"
import { makeContractSpPrefill, openContractSpSendDialog } from "./helpers/panda-contract-sp-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-address-autofill")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-address-autofill" })
story.setWhatWasBuilt(
  "Contract S&P address auto-fill: when the prefill API returns suburb/state/postcode parsed from " +
  "a seller or buyer's street address, those values are mapped into the form's suburb/state/postcode " +
  "fields. Uses panda_suburbs for suburb+state lookup and panda_properties for postcode. " +
  "Falls back to the property's own suburb/state/postcode when the address contains no recognised suburb.",
)

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => { story.write() })

// ── Happy path: sellers with recognised suburb ────────────────────────────────

test.describe("Seller suburb auto-fill — recognised suburb in address", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_SELLER_WITH_SUBURB))

  test("seller 1 suburb field shows title-case suburb parsed from address", async ({ page }) => {
    await openContractSpSendDialog(page)
    const field = page.getByTestId("contract-sp-page1-seller1-suburb")
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(field).toHaveValue("Morayfield")
    await shotFocused(page, field, SHOT_DIR, "01-seller1-suburb")
    story.addScene({
      title: "01 — Seller 1: Suburb auto-filled from address",
      images: [join(SHOT_DIR, "01-seller1-suburb.png")],
      seeing: "Seller 1 suburb field shows 'Morayfield' — parsed from '180/46 AMY STREET MORAYFIELD'.",
      steps: [
        "Open Contract S&P dialog",
        "Page 1 tab is active by default",
        "Suburb field under Seller 1 shows 'Morayfield'",
      ],
    })
  })

  test("seller 1 state field shows state from suburb lookup", async ({ page }) => {
    await openContractSpSendDialog(page)
    const field = page.getByTestId("contract-sp-page1-seller1-state")
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(field).toHaveValue("QLD")
  })

  test("seller 1 postcode field shows postcode from property table", async ({ page }) => {
    await openContractSpSendDialog(page)
    const field = page.getByTestId("contract-sp-page1-seller1-postcode")
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(field).toHaveValue("4506")
    await shotFocused(page, field, SHOT_DIR, "02-seller1-postcode")
    story.addScene({
      title: "02 — Seller 1: Postcode auto-filled",
      images: [join(SHOT_DIR, "02-seller1-postcode.png")],
      seeing: "Seller 1 postcode field shows '4506' — from panda_properties where suburb = 'Morayfield'.",
      steps: ["Open Contract S&P dialog", "Postcode field under Seller 1 shows '4506'"],
    })
  })

  test("seller 2 suburb/state/postcode all auto-filled", async ({ page }) => {
    await openContractSpSendDialog(page)
    const suburb = page.getByTestId("contract-sp-page1-seller2-suburb")
    const state = page.getByTestId("contract-sp-page1-seller2-state")
    const postcode = page.getByTestId("contract-sp-page1-seller2-postcode")
    await expect(suburb).toBeVisible({ timeout: 10_000 })
    await expect(suburb).toHaveValue("Morayfield")
    await expect(state).toHaveValue("QLD")
    await expect(postcode).toHaveValue("4506")
    await shotFocused(page, suburb, SHOT_DIR, "03-seller2-suburb")
    story.addScene({
      title: "03 — Seller 2: All address parts auto-filled",
      images: [join(SHOT_DIR, "03-seller2-suburb.png")],
      seeing: "Seller 2 suburb shows 'Morayfield', state 'QLD', postcode '4506'.",
      steps: ["Open Contract S&P dialog", "Inspect Seller 2 block"],
    })
  })
})

// ── Happy path: buyers mapped from entity record ──────────────────────────────

test.describe("Buyer suburb/state/postcode mapped from entity record", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_SELLER_WITH_SUBURB))

  test("buyer 1 suburb field shows entity esuburb", async ({ page }) => {
    await openContractSpSendDialog(page)
    const field = page.getByTestId("contract-sp-page1-buyer1-suburb")
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(field).toHaveValue("Varsity Lakes")
    await shotFocused(page, field, SHOT_DIR, "04-buyer1-suburb")
    story.addScene({
      title: "04 — Buyer 1: Suburb from entity record",
      images: [join(SHOT_DIR, "04-buyer1-suburb.png")],
      seeing: "Buyer 1 suburb field shows 'Varsity Lakes' — from the buyer entity's esuburb column.",
      steps: ["Open Contract S&P dialog", "Inspect Buyer 1 block"],
    })
  })

  test("buyer 1 state field shows entity estate", async ({ page }) => {
    await openContractSpSendDialog(page)
    const field = page.getByTestId("contract-sp-page1-buyer1-state")
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(field).toHaveValue("QLD")
  })

  test("buyer 1 postcode field shows entity epostcode", async ({ page }) => {
    await openContractSpSendDialog(page)
    const field = page.getByTestId("contract-sp-page1-buyer1-postcode")
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(field).toHaveValue("4227")
  })

  test("buyer 2 suburb/state/postcode all mapped from entity record", async ({ page }) => {
    await openContractSpSendDialog(page)
    const suburb = page.getByTestId("contract-sp-page1-buyer2-suburb")
    const state = page.getByTestId("contract-sp-page1-buyer2-state")
    const postcode = page.getByTestId("contract-sp-page1-buyer2-postcode")
    await expect(suburb).toBeVisible({ timeout: 10_000 })
    await expect(suburb).toHaveValue("Caboolture")
    await expect(state).toHaveValue("QLD")
    await expect(postcode).toHaveValue("4510")
    await shotFocused(page, suburb, SHOT_DIR, "05-buyer2-suburb")
    story.addScene({
      title: "05 — Buyer 2: All fields from entity record",
      images: [join(SHOT_DIR, "05-buyer2-suburb.png")],
      seeing: "Buyer 2 suburb shows 'Caboolture', state 'QLD', postcode '4510'.",
      steps: ["Open Contract S&P dialog", "Inspect Buyer 2 block"],
    })
  })
})

// ── Edge case: address with no recognisable suburb → fallback ─────────────────

test.describe("Fallback — address has no recognisable suburb", () => {
  test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_SELLER_SUBURB_FALLBACK))

  test("seller 1 suburb falls back to property suburb when address has no suburb token", async ({ page }) => {
    await openContractSpSendDialog(page)
    const suburb = page.getByTestId("contract-sp-page1-seller1-suburb")
    const state = page.getByTestId("contract-sp-page1-seller1-state")
    const postcode = page.getByTestId("contract-sp-page1-seller1-postcode")
    await expect(suburb).toBeVisible({ timeout: 10_000 })
    await expect(suburb).toHaveValue("Brisbane City")
    await expect(state).toHaveValue("QLD")
    await expect(postcode).toHaveValue("4000")
    await shotFocused(page, suburb, SHOT_DIR, "06-seller1-fallback")
    story.addScene({
      title: "06 — Seller 1: Fallback to property suburb/state/postcode",
      images: [join(SHOT_DIR, "06-seller1-fallback.png")],
      seeing: "When the seller address contains no recognisable suburb, the form falls back to the property's suburb/state/postcode.",
      steps: ["Open Contract S&P dialog", "Seller address '42 Oak Street' has no suburb token", "Fields show property fallback values"],
    })
  })

  test("buyer 1 with null entity suburb falls back to property suburb", async ({ page }) => {
    await openContractSpSendDialog(page)
    const suburb = page.getByTestId("contract-sp-page1-buyer1-suburb")
    await expect(suburb).toBeVisible({ timeout: 10_000 })
    await expect(suburb).toHaveValue("Brisbane City")
    await shotFocused(page, suburb, SHOT_DIR, "07-buyer1-fallback")
    story.addScene({
      title: "07 — Buyer 1: Fallback suburb when entity has no esuburb",
      images: [join(SHOT_DIR, "07-buyer1-fallback.png")],
      seeing: "When buyer entity has no esuburb, the form falls back to property suburb/state/postcode.",
      steps: ["Open Contract S&P dialog", "Buyer entity has no esuburb", "Suburb shows property fallback 'Brisbane City'"],
    })
  })
})
