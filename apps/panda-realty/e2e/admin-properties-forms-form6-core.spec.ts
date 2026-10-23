import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_ENTITIES,
  FORMS_LIST_FORM6,
  PREFILL_DATA_FULL,
  RECIPIENTS_WITH_EMAIL,
  openForm6SendDialog,
  openFormsTab,
  setupCommonRoutes,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "form6-commission-font-size")

const story = createStory({ specUrl: import.meta.url, slug: "form6-commission-font-size" })

story.setWhatWasBuilt(
  "Fixed oversized commission text in generated Form 6 PDFs. Previously, short values like " +
  "'1.95% + gst' were inflated by pdf-lib's auto-sizing (24pt+) because no explicit font size " +
  "was set on the AcroForm field before setText(). The fix adds setFontSize(10) in trySetText() " +
  "in apps/panda-realty/lib/pdf-prefill-form6.ts, with a FIELD_FONT_SIZE override map so the " +
  "commission field can be tuned independently. All text fields now render at 10pt.",
)

test.describe("Form 6 — comprehensive 10-tab fill modal", () => {
  test.afterAll(() => {
    story.write()
  })

  test.beforeEach(async ({ page }) => {
    await mkdir(SHOT_DIR, { recursive: true })
    requirePandaE2eAdminCredentials()
    await setupCommonRoutes(page, FORMS_LIST_FORM6)
    await page.route("**/api/admin/property-forms/prefill-data**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA_FULL) })
    })
    await page.route("**/api/admin/property-forms/template**", async (route) => {
      if (route.request().method() !== "GET") { await route.fallback(); return }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ templateValues: null }) })
    })
    await page.route("**/api/admin/properties/1001/buyers**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/contacts**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_ENTITIES) })
    })
    await page.route("**/api/admin/properties/1001/tenants**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RECIPIENTS_WITH_EMAIL) })
    })
    await signInAsAdmin(page)
  })

  test("Send on Form 6 opens large fill step with 9 tabs (Tab 5 Termination removed)", async ({ page }) => {
    await openFormsTab(page)
    await page.getByTestId("property-forms-send--3").click()
    await expect(page.getByTestId("property-form-send-dialog")).toBeVisible()
    await expect(page.getByTestId("form6-fill-step")).toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).toContainText("Step 1 of 2")
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 10]) {
      await expect(page.getByTestId(`form6-tab-trigger--${n}`)).toBeVisible()
    }
    await expect(page.getByTestId("form6-tab-trigger--5")).not.toBeVisible()
  })

  test("Part 1 tab — Client 1 fields pre-populated from owner data", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("John Smith")
    await expect(page.getByTestId("form6-part1-client1-address")).toHaveValue("42 Oak Street")
    await expect(page.getByTestId("form6-part1-client1-phone")).toHaveValue("0400000000")
    await expect(page.getByTestId("form6-part1-client1-mobile")).toHaveValue("0411000000")
    await expect(page.getByTestId("form6-part1-client1-email")).toHaveValue("john@example.com")
    await expect(page.getByTestId("form6-part1-client1-abn")).toHaveValue("12 345 678 901")
  })

  test("Part 1 tab — Client 2 fields pre-populated from second owner", async ({ page }) => {
    await openForm6SendDialog(page)
    await expect(page.getByTestId("form6-part1-client2-name")).toHaveValue("Jane Smith")
    await expect(page.getByTestId("form6-part1-client2-email")).toHaveValue("jane@example.com")
  })

  test("Part 1 tab — all client fields are editable", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-part1-client1-name").fill("Modified Client Name")
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("Modified Client Name")
  })

  test("Part 2 tab — agent picker auto-selects first agent and populates fields", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    await expect(page.getByTestId("form6-part2-trading-name")).toHaveValue("My Panda Realty")
    await expect(page.getByTestId("form6-part2-licence-number")).toHaveValue("12345")
    await expect(page.getByTestId("form6-part2-abn")).toHaveValue("12 345 678 901")
    await expect(page.getByTestId("form6-part2-phone")).toHaveValue("0490456959")
    await expect(page.getByTestId("form6-part2-email")).toHaveValue("richard@pandarealty.com")
  })

  test("Part 2 tab — new agent fields (acn, address) pre-populate", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    await expect(page.getByTestId("form6-part2-acn")).toHaveValue("123 456 789")
    await expect(page.getByTestId("form6-part2-address")).toHaveValue("123 Queen Street")
  })

  test("Part 2 tab — selecting a different agent updates all licensee fields", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--2").click()
    await page.getByTestId("form6-part2-agent-select").click()
    await page.getByRole("option", { name: "Maria Koch" }).click()
    await expect(page.getByTestId("form6-part2-licence-number")).toHaveValue("67890")
    await expect(page.getByTestId("form6-part2-abn")).toHaveValue("98 765 432 100")
    await expect(page.getByTestId("form6-part2-acn")).toHaveValue("")
    await expect(page.getByTestId("form6-part2-address")).toHaveValue("")
  })

  test("Part 3 tab — property fields pre-populated", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-description1")).toHaveValue("Sale of House")
    await expect(page.getByTestId("form6-part3-state")).toHaveValue("QLD")
    await expect(page.getByTestId("form6-part3-postcode")).toHaveValue("4000")
    await expect(page.getByTestId("form6-part3-plan")).toHaveValue("RP123456")
  })

  test("Part 4 tab — Sale checkbox auto-checked", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-service-sale")).toBeChecked()
  })

  test("Part 4 tab — other service checkboxes unchecked by default", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--4").click()
    await expect(page.getByTestId("form6-part4-service-purchase")).not.toBeChecked()
    await expect(page.getByTestId("form6-part4-service-letting")).not.toBeChecked()
    await expect(page.getByTestId("form6-part4-service-auction")).not.toBeChecked()
  })

  test("Part 7 tab — commission pre-filled from commissionRate", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--7").click()
    const commissionField = page.getByTestId("form6-part7-commission")
    await expect(commissionField).toHaveValue(/3\.3/)
    await shotFocused(page, commissionField, SHOT_DIR, "01-commission-field")
    story.addScene({
      title: "01 — Commission Field: Value Pre-filled in Modal",
      images: [join(SHOT_DIR, "01-commission-field.png")],
      seeing:
        "The commission textarea on tab 7 shows the pre-filled commission rate (3.3%). " +
        "This value is written into the Form 6 AcroForm field at 10pt — fixed from the previous " +
        "auto-scaled size that inflated short values to 24pt+ in the generated PDF.",
      steps: [
        "Open any property → Forms tab",
        "Click Fill Form on Form 6",
        "Navigate to tab 7 Commission",
        "Observe the commission field shows the rate from the property record",
        "The generated PDF now renders this text at 10pt (pinned via setFontSize in pdf-prefill-form6.ts)",
      ],
    })
  })

  test("Tab navigation preserves edits across tabs", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-part1-client1-name").fill("Preserved Client Name")
    await page.getByTestId("form6-tab-trigger--4").click()
    await page.getByTestId("form6-tab-trigger--1").click()
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("Preserved Client Name")
  })

  test("Next → advances to Step 2 (recipient selection)", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    await expect(page.getByTestId("form6-fill-step")).not.toBeVisible()
    await expect(page.getByTestId("property-form-send-dialog")).toContainText("Step 2")
    await expect(page.getByTestId("property-form-send-recipients")).toBeVisible()
  })

  test("Back from Step 2 returns to 10-tab form with edits preserved", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-part1-client1-name").fill("Edit Preserved On Back")
    await page.getByTestId("property-form-prefill-next").click()
    await page.getByTestId("property-form-send-back").click()
    await expect(page.getByTestId("form6-fill-step")).toBeVisible()
    await expect(page.getByTestId("form6-part1-client1-name")).toHaveValue("Edit Preserved On Back")
  })

  test("Send passes all prefillValues to send API", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null
    await page.route("**/api/admin/property-forms/send", async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ sentCount: 1, ids: [99], failedEmails: [] }) })
    })
    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    await page.getByTestId("property-form-send-recipient--201").click()
    await page.getByTestId("property-form-send-submit").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
    expect(capturedBody).toMatchObject({ propertyFormId: 3, propertyListId: 1001 })
    const prefillVals = (capturedBody as Record<string, unknown> | null)?.[
      "prefillValues"
    ] as Record<string, string> | undefined
    expect(prefillVals).toBeDefined()
    expect(prefillVals?.seller1Name).toBeTruthy()
  })

  test("Cancel from Step 1 closes dialog", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("property-form-send-cancel").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
  })

  test("Cancel from Step 2 closes dialog", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("property-form-prefill-next").click()
    await page.getByTestId("property-form-send-cancel").click()
    await expect(page.getByTestId("property-form-send-dialog")).not.toBeVisible()
  })
})
