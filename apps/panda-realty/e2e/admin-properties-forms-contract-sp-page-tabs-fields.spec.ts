/**
 * E2E: Contract S&P — Pages 1–3 field presence
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-forms-contract-sp-page-tabs-fields.spec.ts"
 */
import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"
import { CSP_PREFILL_DATA_FULL, CSP_PREFILL_DATA_WITH_OFFER } from "./helpers/panda-contract-sp-mock-data"
import { makeContractSpPrefill, openContractSpSendDialog } from "./helpers/panda-contract-sp-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "contract-sp-tabs-fields")

const story = createStory({ specUrl: import.meta.url, slug: "contract-sp-tabs-fields" })
story.setWhatWasBuilt(
  "Contract S&P Pages 1–3: all previously missing fields are now present. " +
  "Page 1 adds suburb/state/postcode to sellers, agent, solicitor, and buyers. " +
  "Page 2 adds entire Buyer's Agent section plus deposit trust account fields. " +
  "Page 3 adds GST Withholding Obligation radio (not-required / required).",
)

test.describe("Contract S&P — Pages 1–3 field presence", () => {
  test.beforeEach(async () => {
    await mkdir(SHOT_DIR, { recursive: true })
  })

  test.afterAll(() => {
    story.write()
  })

  test.describe("Page 1 fields", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

    test("Page 1 — contract date field at top", async ({ page }) => {
      await openContractSpSendDialog(page)
      await expect(page.getByTestId("contract-sp-page1-contract-date")).toBeVisible()
    })

    test("Page 1 — seller 1 has suburb, state, postcode fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "02-page1-seller1")
      story.addScene({
        title: "02 — Page 1: Seller 1 with suburb/state/postcode",
        images: [join(SHOT_DIR, "02-page1-seller1.png")],
        seeing: "Seller 1 block includes Suburb, State, Postcode fields previously absent from the form.",
        steps: ["Open dialog", "Page 1 tab is active by default"],
      })
      await expect(page.getByTestId("contract-sp-page1-seller1-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller1-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller1-postcode")).toBeVisible()
    })

    test("Page 1 — seller 2 has suburb, state, postcode fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      await expect(page.getByTestId("contract-sp-page1-seller2-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller2-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller2-postcode")).toBeVisible()
    })

    test("Page 1 — seller's agent has address, suburb, state, postcode, mobile fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      await expect(page.getByTestId("contract-sp-page1-agent-address")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-agent-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-agent-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-agent-postcode")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-agent-mobile")).toBeVisible()
    })

    test("Page 1 — seller's solicitor has suburb, state, postcode, mobile fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      await expect(page.getByTestId("contract-sp-page1-seller-solicitor-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller-solicitor-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller-solicitor-postcode")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-seller-solicitor-mobile")).toBeVisible()
    })

    test("Page 1 — buyer 1 has suburb, state, postcode fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      await expect(page.getByTestId("contract-sp-page1-buyer1-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-buyer1-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-buyer1-postcode")).toBeVisible()
    })

    test("Page 1 — buyer 2 has suburb, state, postcode fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      await expect(page.getByTestId("contract-sp-page1-buyer2-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-buyer2-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page1-buyer2-postcode")).toBeVisible()
    })
  })

  test.describe("Page 2 fields", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_FULL))

    test("Page 2 — buyer's agent section visible with all fields", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "03-page2-buyer-agent")
      story.addScene({
        title: "03 — Page 2: Buyer's Agent section",
        images: [join(SHOT_DIR, "03-page2-buyer-agent.png")],
        seeing: "Page 2 shows a full Buyer's Agent block (previously absent from the form entirely).",
        steps: ["Open dialog", "Click Page 2 tab"],
      })
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-name")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-abn")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-licence-number")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-address")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-phone")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-mobile")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-agent-email")).toBeVisible()
    })

    test("Page 2 — buyer's solicitor has suburb, state, postcode, mobile", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      await expect(page.getByTestId("contract-sp-page2-buyer-solicitor-suburb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-solicitor-state")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-solicitor-postcode")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-buyer-solicitor-mobile")).toBeVisible()
    })

    test("Page 2 — property area field visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      await expect(page.getByTestId("contract-sp-page2-area")).toBeVisible()
    })

    test("Page 2 — sold as radio (freehold/leasehold) visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      await expect(page.getByTestId("contract-sp-page2-sold-as-freehold")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-sold-as-leasehold")).toBeVisible()
    })

    test("Page 2 — land use radio (builtOn/vacant) visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      await expect(page.getByTestId("contract-sp-page2-land-use-built-on")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-land-use-vacant")).toBeVisible()
    })

    test("Page 2 — present use, excluded fixtures, included chattels visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      await expect(page.getByTestId("contract-sp-page2-present-use")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-excluded-fixtures")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-included-chattels")).toBeVisible()
    })

    test("Page 2 — deposit trust account fields visible", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--2").click()
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "04-page2-deposit-fields")
      story.addScene({
        title: "04 — Page 2: Deposit trust account fields",
        images: [join(SHOT_DIR, "04-page2-deposit-fields.png")],
        seeing: "Deposit section now includes Holder, Trust Account, Bank, BSB, Account No, Payable On, Default Interest Rate.",
        steps: ["Open dialog", "Click Page 2 tab", "Scroll to deposit section"],
      })
      await expect(page.getByTestId("contract-sp-page2-deposit-holder")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-deposit-holder-trust-account")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-deposit-bank")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-deposit-bsb")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-deposit-account-no")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-deposit-payable-on")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page2-default-interest-rate")).toBeVisible()
    })
  })

  test.describe("Page 3 fields", () => {
    test.beforeEach(makeContractSpPrefill(CSP_PREFILL_DATA_WITH_OFFER))

    test("Page 3 — gst withholding obligation radio visible (not-required / required)", async ({ page }) => {
      await openContractSpSendDialog(page)
      await page.getByTestId("contract-sp-tab-trigger--3").click()
      const fill = page.getByTestId("contract-sp-fill-step")
      await shotFocused(page, fill, SHOT_DIR, "05-page3-gst-withholding-obligation")
      story.addScene({
        title: "05 — Page 3: GST Withholding Obligation radio",
        images: [join(SHOT_DIR, "05-page3-gst-withholding-obligation.png")],
        seeing: "Page 3 now includes the GST Withholding Obligation radio group (Not Required / Required) that was previously missing.",
        steps: ["Open dialog", "Click Page 3 tab"],
      })
      await expect(page.getByTestId("contract-sp-page3-gst-withholding-obligation-not-required")).toBeVisible()
      await expect(page.getByTestId("contract-sp-page3-gst-withholding-obligation-required")).toBeVisible()
    })
  })
})
