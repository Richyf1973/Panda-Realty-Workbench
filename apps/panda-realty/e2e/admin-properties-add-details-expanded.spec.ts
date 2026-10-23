// Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-add-details-expanded.spec.ts" --no-bail

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createStory, shotFocused } from "@repo/e2e-utils"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  EMPTY_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "add-property-details-expanded",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "add-property-details-expanded",
})

story.setWhatWasBuilt(
  "The PROPERTY DETAILS collapsible section in the Add Property dialog now opens expanded by default, " +
    "so all address and property fields are immediately visible when creating a new record. " +
    "The Edit Property dialog preserves its existing collapsed-by-default behaviour. " +
    "Changed: panda-properties-dialog-form.tsx line 56 — useState(false) → useState(propertyListId === null).",
)

test.beforeEach(async ({ page }) => {
  if (!e2eAdminCredentials) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  await mkdir(SHOT_DIR, { recursive: true })

  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/property-entities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE),
    })
  })

  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

// ── helpers ──────────────────────────────────────────────────────────────────

async function openAddDialog(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_LIST_RESPONSE),
    })
  })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible()
  await page.getByTestId("admin-entity-list-add-new--properties").click()
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
}

async function openEditDialog(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/properties**", async (route) => {
    const url = route.request().url()
    if (url.includes("/buyer-offers")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      return
    }
    if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SINGLE_PROPERTY_RESPONSE.items[0]),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SINGLE_PROPERTY_RESPONSE),
    })
  })
  await page.goto("/admin/properties")
  await expect(page.getByTestId("admin-entity-table-body--properties")).toBeVisible()
  await page.getByTestId("admin-entity-row--properties--1001").click()
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
}

// ── tests ─────────────────────────────────────────────────────────────────────

test("Add Property dialog: PROPERTY DETAILS section starts expanded", async ({ page }) => {
  await openAddDialog(page)

  const coreSection = page.getByTestId("panda-properties-form-section--core")
  await expect(coreSection).toBeVisible()

  // Must be expanded WITHOUT clicking the trigger
  await expect(coreSection).toHaveAttribute("data-state", "open")
  const streetField = page.locator("#pp-streetAddress")
  await expect(streetField).toBeVisible({ timeout: 10_000 })

  await shotFocused(page, coreSection, SHOT_DIR, "01-add-expanded")
  story.addScene({
    title: "01 — Add Property: PROPERTY DETAILS expanded on open",
    images: [join(SHOT_DIR, "01-add-expanded.png")],
    seeing:
      "Add Property dialog with PROPERTY DETAILS section open — Street Address and other fields visible immediately without any user interaction.",
    steps: [
      "Navigate to /admin/properties",
      "Click + Add property",
      "Observe PROPERTY DETAILS is expanded with data-state=open",
      "Observe Street Address field is visible without clicking the trigger",
    ],
  })
})

test("Edit Property dialog: PROPERTY DETAILS section stays collapsed", async ({ page }) => {
  await openEditDialog(page)

  const coreSection = page.getByTestId("panda-properties-form-section--core")
  await expect(coreSection).toBeVisible()

  // Must remain collapsed — existing behaviour preserved
  await expect(coreSection).toHaveAttribute("data-state", "closed")
  await expect(page.locator("#pp-streetAddress")).not.toBeVisible()

  await shotFocused(page, coreSection, SHOT_DIR, "02-edit-collapsed")
  story.addScene({
    title: "02 — Edit Property: PROPERTY DETAILS collapsed on open",
    images: [join(SHOT_DIR, "02-edit-collapsed.png")],
    seeing:
      "Edit Property dialog with PROPERTY DETAILS section closed — fields hidden, chevron pointing downward.",
    steps: [
      "Navigate to /admin/properties",
      "Click an existing property row to open Edit dialog",
      "Observe PROPERTY DETAILS is collapsed with data-state=closed",
      "Observe Street Address field is not visible",
    ],
  })
})

test("Add Property dialog: user can manually collapse the expanded section", async ({ page }) => {
  await openAddDialog(page)

  const coreSection = page.getByTestId("panda-properties-form-section--core")
  const trigger = page.getByTestId("panda-properties-form-section--core-trigger")

  // Verify starts expanded
  await expect(coreSection).toHaveAttribute("data-state", "open")

  await shotFocused(page, coreSection, SHOT_DIR, "03a-add-before-collapse")

  // Collapse it
  await trigger.click()
  await expect(coreSection).toHaveAttribute("data-state", "closed")
  await expect(page.locator("#pp-streetAddress")).not.toBeVisible()

  await shotFocused(page, coreSection, SHOT_DIR, "03b-add-after-collapse")
  story.addScene({
    title: "03 — Add Property: section can be manually collapsed",
    images: [
      join(SHOT_DIR, "03a-add-before-collapse.png"),
      join(SHOT_DIR, "03b-add-after-collapse.png"),
    ],
    seeing:
      "Left: PROPERTY DETAILS expanded on open. Right: user clicked the trigger — section collapsed, fields hidden.",
    steps: [
      "Open Add Property dialog (section is expanded)",
      "Click the PROPERTY DETAILS trigger",
      "Observe section collapses to data-state=closed",
    ],
  })
})

test("Add Property dialog: re-opening resets section to expanded", async ({ page }) => {
  await openAddDialog(page)

  const coreSection = page.getByTestId("panda-properties-form-section--core")
  const trigger = page.getByTestId("panda-properties-form-section--core-trigger")

  // Collapse the section
  await expect(coreSection).toHaveAttribute("data-state", "open")
  await trigger.click()
  await expect(coreSection).toHaveAttribute("data-state", "closed")

  // Close the dialog
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("panda-properties-dialog-form")).not.toBeVisible()

  // Re-open Add dialog
  await page.getByTestId("admin-entity-list-add-new--properties").click()
  await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()

  const coreSectionNew = page.getByTestId("panda-properties-form-section--core")
  await expect(coreSectionNew).toHaveAttribute("data-state", "open")
  await expect(page.locator("#pp-streetAddress")).toBeVisible({ timeout: 10_000 })

  await shotFocused(page, coreSectionNew, SHOT_DIR, "04-add-reopen-expanded")
  story.addScene({
    title: "04 — Add Property: re-opening resets to expanded",
    images: [join(SHOT_DIR, "04-add-reopen-expanded.png")],
    seeing:
      "After closing and re-opening the Add Property dialog, PROPERTY DETAILS is expanded again — state does not carry over.",
    steps: [
      "Open Add Property dialog",
      "Collapse PROPERTY DETAILS manually",
      "Close the dialog (Escape)",
      "Re-open Add Property dialog",
      "Observe PROPERTY DETAILS is expanded again",
    ],
  })
})

test("Add Property dialog: validation auto-expands the section after manual collapse", async ({
  page,
}) => {
  await openAddDialog(page)

  const coreSection = page.getByTestId("panda-properties-form-section--core")
  const trigger = page.getByTestId("panda-properties-form-section--core-trigger")

  // Starts expanded — collapse manually
  await expect(coreSection).toHaveAttribute("data-state", "open")
  await trigger.click()
  await expect(coreSection).toHaveAttribute("data-state", "closed")

  await shotFocused(page, coreSection, SHOT_DIR, "05a-add-before-submit")

  // Submit without required fields — should trigger auto-expand
  await page
    .getByTestId("admin-entity-create-form--properties")
    .getByRole("button", { name: /create/i })
    .first()
    .click()

  await expect(coreSection).toHaveAttribute("data-state", "open")
  await expect(
    page.getByTestId("panda-properties-form-field-error--streetAddress"),
  ).toBeVisible({ timeout: 10_000 })

  await shotFocused(page, coreSection, SHOT_DIR, "05b-add-after-submit-errors")
  story.addScene({
    title: "05 — Add Property: validation auto-expands collapsed section",
    images: [
      join(SHOT_DIR, "05a-add-before-submit.png"),
      join(SHOT_DIR, "05b-add-after-submit-errors.png"),
    ],
    seeing:
      "Left: section manually collapsed before submit. Right: after clicking Create — section auto-expands showing Street Address validation error.",
    steps: [
      "Open Add Property dialog (expanded by default)",
      "Collapse PROPERTY DETAILS manually",
      "Click Create without filling required fields",
      "Observe section auto-expands revealing validation errors",
    ],
  })
})
