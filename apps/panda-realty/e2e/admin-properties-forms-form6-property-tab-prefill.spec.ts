// Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/admin-properties-forms-form6-property-tab-prefill.spec.ts --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import {
  PREFILL_DATA_FULL,
  PREFILL_DATA_SELLER1_NO_MOBILE,
  makeForm6Prefill,
  openForm6SendDialog,
} from "./helpers/panda-form6-send-mocks"

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "screenshots", "form6-property-tab-prefill")

const story = createStory({ specUrl: import.meta.url, slug: "form6-property-tab-prefill" })

story.setWhatWasBuilt(
  "Send Form Property tab (Form 6 step 3): Description 1 is now pre-filled with 'Sale of {propertyType}' " +
  "(not the street address); Description 2 (suburb) field is removed from the UI and PDF; " +
  "Lot and Plan remain pre-filled from the rpd column. " +
  "Files changed: form6-part3-property.tsx, form6-prefill-values.ts, prefill-types.ts, " +
  "form6-prefill.ts (API), prefill-mappers.ts, pdf-prefill-form6.ts.",
)

const PREFILL_WITH_DESCRIPTION = {
  ...PREFILL_DATA_FULL,
  propertyDescription1: "Sale of House",
}

const PREFILL_WITH_COLON_TYPE = {
  ...PREFILL_DATA_FULL,
  propertyDescription1: "Sale of House: Duplex",
}

const PREFILL_NULL_DESCRIPTION = {
  ...PREFILL_DATA_FULL,
  propertyDescription1: null,
}

test.beforeEach(async () => {
  await mkdir(SHOT_DIR, { recursive: true })
})

test.afterAll(() => {
  story.write()
})

// ─── Description 1 pre-fill from propertyDescription1 ────────────────────────

test.describe("Form 6 Property tab — Description 1 pre-filled from propertyDescription1", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_WITH_DESCRIPTION))

  test("Description 1 shows propertyDescription1 value, not street address", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()

    const desc1 = page.getByTestId("form6-part3-description1")
    await expect(desc1).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, desc1, SHOT_DIR, "01-description1-prefilled")
    story.addScene({
      title: "01 — Description 1 Pre-filled as 'Sale of House'",
      images: [join(SHOT_DIR, "01-description1-prefilled.png")],
      seeing: "Description 1 shows 'Sale of House' from propertyDescription1, not the street address '42 Oak Street'.",
      steps: ["Open Send Form → 3 Property tab", "Observe Description 1 field value"],
    })
    await expect(desc1).toHaveValue("Sale of House")
  })

  test("Description 1 is editable and retains user edits after pre-fill", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()

    const desc1 = page.getByTestId("form6-part3-description1")
    // Verify pre-fill is correct first (will fail in red if not wired yet)
    await expect(desc1).toHaveValue("Sale of House")
    await desc1.fill("Sale of Villa")
    await expect(desc1).toHaveValue("Sale of Villa")
  })

  test("Editing Address field does NOT change Description 1", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()

    const desc1 = page.getByTestId("form6-part3-description1")
    await page.getByTestId("form6-part3-address").fill("99 New Street")

    await shotFocused(page, desc1, SHOT_DIR, "02-desc1-independent-from-address")
    story.addScene({
      title: "02 — Description 1 Independent from Address Field",
      images: [join(SHOT_DIR, "02-desc1-independent-from-address.png")],
      seeing:
        "After editing the Address field to '99 New Street', Description 1 still shows 'Sale of House' — the two fields are independent.",
      steps: [
        "Open Send Form → 3 Property tab",
        "Edit Address to '99 New Street'",
        "Observe Description 1 unchanged at 'Sale of House'",
      ],
    })
    await expect(desc1).toHaveValue("Sale of House")
  })
})

// ─── Property type with colon ────────────────────────────────────────────────

test.describe("Form 6 Property tab — Description 1 with colon property type", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_WITH_COLON_TYPE))

  test("Property type with colon rendered as-is in Description 1", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()

    const desc1 = page.getByTestId("form6-part3-description1")
    await expect(desc1).toBeVisible({ timeout: 10_000 })
    await shotFocused(page, desc1, SHOT_DIR, "03-description1-colon-type")
    story.addScene({
      title: "03 — Description 1 Preserves Colon in Property Type",
      images: [join(SHOT_DIR, "03-description1-colon-type.png")],
      seeing: "Description 1 shows 'Sale of House: Duplex' — the colon in the property type is preserved as-is.",
      steps: [
        "Open Send Form for a property with type 'House: Duplex'",
        "Open 3 Property tab",
        "Observe Description 1 value",
      ],
    })
    await expect(desc1).toHaveValue("Sale of House: Duplex")
  })
})

// ─── null propertyDescription1 fallback ─────────────────────────────────────

test.describe("Form 6 Property tab — Description 1 null fallback", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_NULL_DESCRIPTION))

  test("Description 1 shows empty string when propertyDescription1 is null", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    // Should be "" not the street address "42 Oak Street"
    await expect(page.getByTestId("form6-part3-description1")).toHaveValue("")
  })
})

// ─── Description 2 absent ────────────────────────────────────────────────────

test.describe("Form 6 Property tab — Description 2 field removed", () => {
  test.beforeEach(makeForm6Prefill(PREFILL_WITH_DESCRIPTION))

  test("Description 2 (suburb) field is absent from the Property tab", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()

    const desc1 = page.getByTestId("form6-part3-description1")
    await expect(desc1).toBeVisible({ timeout: 10_000 })
    // Stabilise: wait for the Address field (always present) to have its value, proving tab is fully rendered
    await expect(page.getByTestId("form6-part3-address")).toHaveValue("42 Oak Street", { timeout: 10_000 })

    await shotFocused(page, desc1, SHOT_DIR, "04-no-description2")
    story.addScene({
      title: "04 — Description 2 Removed from Property Tab",
      images: [join(SHOT_DIR, "04-no-description2.png")],
      seeing:
        "The PROPERTY DESCRIPTION section shows only Description 1 — no Description 2 (suburb) field exists.",
      steps: [
        "Open Send Form → 3 Property tab",
        "Observe PROPERTY DESCRIPTION section has only one field (Description 1)",
      ],
    })
    // Point-in-time count — no polling window that could catch a brief unmount
    const suburbCount = await page.getByTestId("form6-part3-suburb").count()
    expect(suburbCount).toBe(0)
  })
})

// ─── Null rpd — Lot and Plan blank (regression) ──────────────────────────────

test.describe("Form 6 Property tab — Lot/Plan blank when rpd is null", () => {
  test.beforeEach(makeForm6Prefill({ ...PREFILL_DATA_SELLER1_NO_MOBILE, propertyDescription1: "Sale of Over 50's" }))

  test("Lot and Plan are blank when propertyLot and propertyPlan are null", async ({ page }) => {
    await openForm6SendDialog(page)
    await page.getByTestId("form6-tab-trigger--3").click()
    await expect(page.getByTestId("form6-part3-lot")).toHaveValue("")
    await expect(page.getByTestId("form6-part3-plan")).toHaveValue("")
  })
})
