import { expect, test } from "@playwright/test"

import {
  PREFILL_DATA_NO_OWNERS,
  PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

const setup = makeForm6Prefill

// ─── Tab 1: new client 1 fields auto-populated ───────────────────────────────

test.describe("Form 6 — Tab 1 new client fields autofill — client 1", () => {
  test.beforeEach(setup(PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS))

  test("Name (line 2) blank — not prefilled from owner nameLine2", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-nameline2")).toHaveValue("")
  })

  test("ACN blank — not prefilled from owner acn", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-acn")).toHaveValue("")
  })

  test("GST registered radio pre-filled Yes from owner gstRegistered", async ({ page }) => {
    await openForm6SendDialog(page)
    const yesRadio = page.locator("[data-testid='form6-part1-client1-gst-registered'] input[value='Yes']")
    await expect(yesRadio).toBeChecked()
  })

  test("Address (line 2) pre-filled from owner address2", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-address2")).toHaveValue("Unit 5")
  })

  test("Fax pre-filled from owner fax", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-fax")).toHaveValue("0700000001")
  })

  test("All new client 1 fields remain editable after pre-fill", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-part1-client1-nameline2").fill("Edited Name 2")
    await expect(page.getByTestId("form6-part1-client1-nameline2")).toHaveValue("Edited Name 2")
    await page.getByTestId("form6-part1-client1-acn").fill("000 000 001")
    await expect(page.getByTestId("form6-part1-client1-acn")).toHaveValue("000 000 001")
  })
})

// ─── Tab 1: new client 2 fields auto-populated ───────────────────────────────

test.describe("Form 6 — Tab 1 new client fields autofill — client 2", () => {
  test.beforeEach(setup(PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS))

  test("Client 2 ACN blank — not prefilled from owner2 acn", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client2-acn")).toHaveValue("")
  })

  test("Client 2 GST registered radio pre-filled No", async ({ page }) => {
    await openForm6SendDialog(page)
    const noRadio = page.locator("[data-testid='form6-part1-client2-gst-registered'] input[value='No']")
    await expect(noRadio).toBeChecked()
  })

  test("Client 2 Fax pre-filled from owner2 fax", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client2-fax")).toHaveValue("0700000002")
  })

  test("Client 2 Name (line 2) blank when owner2 nameLine2 is empty", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client2-nameline2")).toHaveValue("")
  })
})

// ─── Tab 1: new fields blank when no owner data ───────────────────────────────

test.describe("Form 6 — Tab 1 new client fields blank when no sellers", () => {
  test.beforeEach(setup(PREFILL_DATA_NO_OWNERS))

  test("Client 1 nameLine2 blank when no owner", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-nameline2")).toHaveValue("")
  })

  test("Client 1 ACN blank when no owner", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-acn")).toHaveValue("")
  })

  test("Client 1 Address (line 2) blank when no owner", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-address2")).toHaveValue("")
  })

  test("Client 1 Fax blank when no owner", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-fax")).toHaveValue("")
  })
})
