import { expect, test } from "@playwright/test"

import {
  PREFILL_DATA_FULL,
  PREFILL_DATA_PLAN_ONLY,
  PREFILL_DATA_SELLER1_NO_MOBILE,
  PREFILL_DATA_WITH_PRICE,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

const setupPrefill = makeForm6Prefill

// ─── Tab 1: suburb / state / postcode from property ──────────────────────────

test.describe("Form 6 autofill — Tab 1 suburb/state/postcode from property record", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Client 1 suburb pre-filled from property suburb", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-suburb")).toHaveValue("Brisbane City")
  })

  test("Client 1 state pre-filled from property state", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-state")).toHaveValue("QLD")
  })

  test("Client 1 postcode pre-filled from property postcode", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-postcode")).toHaveValue("4000")
  })

  test("Client 2 suburb/state/postcode pre-filled from same property record", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client2-suburb")).toHaveValue("Brisbane City")
    await expect(page.getByTestId("form6-part1-client2-state")).toHaveValue("QLD")
    await expect(page.getByTestId("form6-part1-client2-postcode")).toHaveValue("4000")
  })

  test("Client suburb/state/postcode fields remain editable", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-part1-client1-suburb").fill("Newstead")
    await expect(page.getByTestId("form6-part1-client1-suburb")).toHaveValue("Newstead")
  })
})

// ─── Tab 1: phone → mobile fallback ──────────────────────────────────────────

test.describe("Form 6 autofill — Tab 1 mobile blank when seller1 mobile is null", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_SELLER1_NO_MOBILE))

  test("Client 1 mobile blank when seller1.mobile is null (no phone fallback)", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-mobile")).toHaveValue("")
  })
})

test.describe("Form 6 autofill — Tab 1 phone→mobile fallback — seller1 mobile set", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Client 1 mobile NOT overwritten when seller1.mobile is set", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_FULL: seller1.mobile = "0411000000", seller1.phone = "0400000000"
    await expect(page.getByTestId("form6-part1-client1-mobile")).toHaveValue("0411000000")
  })

  test("Client 2 mobile blank when seller2.mobile is null (no phone fallback)", async ({ page }) => {
    await openForm6SendDialog(page)
    // PREFILL_DATA_FULL: seller2.mobile = null
    await expect(page.getByTestId("form6-part1-client2-mobile")).toHaveValue("")
  })
})

// ─── Tab 2: agent phone → mobile fallback ────────────────────────────────────

test.describe("Form 6 autofill — Tab 2 agent phone→mobile fallback", () => {
  test.beforeEach(setupPrefill(PREFILL_DATA_FULL))

  test("Agent mobile copied from phone when agent.mobile is null (Maria Koch)", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    // Switch to Maria Koch who has mobile: null, phone: "0493635666"
    await page.getByTestId("form6-part2-agent-select").click()
    await page.getByRole("option", { name: "Maria Koch" }).click()
    await expect(page.getByTestId("form6-part2-phone")).toHaveValue("0493635666")
    await expect(page.getByTestId("form6-part2-mobile")).toHaveValue("0493635666")
  })

  test("Agent mobile NOT overwritten when agent.mobile is set (Richard Falzon)", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    // Richard Falzon auto-selected (first agent): mobile = "0490456959", phone = "0490456959"
    await expect(page.getByTestId("form6-part2-mobile")).toHaveValue("0490456959")
  })
})

// ─── Tab 3: RPD → Lot + Plan ─────────────────────────────────────────────────

test.describe("Form 6 autofill — Tab 3 RPD parsed into Lot + Plan", () => {
  test("Slash RPD format — Lot and Plan filled from route response", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_FULL)({ page })
    // PREFILL_DATA_FULL: propertyLot: "12", propertyPlan: "RP123456"
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-lot")).toHaveValue("12")
    await expect(page.getByTestId("form6-part3-plan")).toHaveValue("RP123456")
  })

  test("Plan-only RPD — Lot is blank, Plan filled", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_PLAN_ONLY)({ page })
    // PREFILL_DATA_PLAN_ONLY: propertyLot: "", propertyPlan: "SP239098"
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-lot")).toHaveValue("")
    await expect(page.getByTestId("form6-part3-plan")).toHaveValue("SP239098")
  })

  test("Null RPD — Lot and Plan both blank", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_SELLER1_NO_MOBILE)({ page })
    // PREFILL_DATA_SELLER1_NO_MOBILE: propertyLot: null, propertyPlan: null
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-lot")).toHaveValue("")
    await expect(page.getByTestId("form6-part3-plan")).toHaveValue("")
  })
})

// ─── Tab 4: appraisedAmount → $ amount + List checkbox ───────────────────────

test.describe("Form 6 autofill — Tab 4 appraisedAmount pre-fills price amount", () => {
  test("appraisedAmount pre-fills $ amount formatted as 825,000.00", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_WITH_PRICE)({ page })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-price-amount")).toHaveValue("825,000.00")
  })

  test("appraisedAmount auto-ticks the List checkbox", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_WITH_PRICE)({ page })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-price-list")).toBeChecked()
  })

  test("Reserve and Letting checkboxes remain unticked when appraisedAmount set", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_WITH_PRICE)({ page })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.locator("[data-testid='form6-part4-price-list']")).toBeChecked()
    // Reserve and Letting have no testids — verify by label
    const reserveCheckbox = page.getByRole("checkbox", { name: "Reserve", exact: true })
    const lettingCheckbox = page.getByRole("checkbox", { name: "Letting", exact: true })
    await expect(reserveCheckbox).not.toBeChecked()
    await expect(lettingCheckbox).not.toBeChecked()
  })

  test("No appraisedAmount — $ amount is blank and List unchecked", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_FULL)({ page })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-price-amount")).toHaveValue("")
    await expect(page.getByTestId("form6-part4-price-list")).not.toBeChecked()
  })

  test("$ amount is editable after pre-fill", async ({ page }) => {
    await setupPrefill(PREFILL_DATA_WITH_PRICE)({ page })
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-part4-price-amount").fill("900,000.00")
    await expect(page.getByTestId("form6-part4-price-amount")).toHaveValue("900,000.00")
  })
})
