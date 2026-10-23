/**
 * Panda Realty — Status side filter panel stays open across filter changes
 *
 * Run:
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-side-filter-panel-stays-open.spec.ts" --no-bail
 *
 * Regression cover for the "panel snaps shut on Clear/selection" bug. The list card is wrapped in
 * a hidden-rows provider keyed by the URL search, so every filter change remounts it. The
 * collapsible side panel's open/closed state is owned ABOVE that provider (admin-entity-admin.tsx)
 * and persisted to localStorage, so it must survive a selection, a Clear, and a reload.
 *
 * localStorage key under test:
 *   admin:list:properties:side-filters-panel-open  — "1" open / "0" collapsed
 */

import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { getLocalStorage, setupMocks } from "./helpers/status-filter-helpers"

const CARD_TESTID = "admin-entity-list-card--properties"
const PANEL_TOGGLE_TESTID = "admin-entity-filter-side-panel-toggle--properties"
const SECTION_TESTID = "admin-entity-list-relation-filter--properties--propertyStatusId"
const CLEAR_TESTID = "admin-entity-list-relation-filter-clear--properties--propertyStatusId"

const LS_PANEL_KEY = "admin:list:properties:side-filters-panel-open"
const LS_VALUES_KEY = "panda-realty:list-filter:properties:propertyStatusId:values"

// Option rows render the status CODE as their visible label / accessible name.
const OPT_COMING = "COMING" // Coming Soon (id 2)

test.beforeEach(async ({ page }) => {
  test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
  // NOTE: do NOT clear the panel-open key here. addInitScript re-runs on every navigation
  // (including page.reload()), so clearing it would wipe the persisted choice before the app reads
  // it and break the reload-restore test. The other keys are safe to reset on each load.
  await page.addInitScript(() => {
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:values")
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:collapsed")
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:favorites")
    window.localStorage.removeItem("panda-realty:list-filter:properties:propertyStatusId:hidden")
  })
  await setupMocks(page)
  await signInAsAdmin(page)
})

async function goToProperties(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await page.getByTestId(CARD_TESTID).waitFor({ state: "visible" })
}

// The panel starts collapsed (listSideFiltersPanelCollapsible). Open it and confirm the Status
// section is mounted before each scenario.
async function expandPanel(page: import("@playwright/test").Page) {
  const toggle = page.getByTestId(PANEL_TOGGLE_TESTID)
  await toggle.waitFor({ state: "visible" })
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await page.getByTestId(SECTION_TESTID).waitFor({ state: "visible" })
}

test.describe("Panda Realty — Status side filter panel stays open across filter changes", () => {
  test("panel stays open after selecting a status option", async ({ page }) => {
    await goToProperties(page)
    await expandPanel(page)

    // Ticking an option changes the URL, which remounts the list card. Pre-fix this collapsed the
    // panel; it must now stay open.
    await page.getByRole("checkbox", { name: OPT_COMING }).check()
    await expect(page.getByRole("checkbox", { name: OPT_COMING })).toBeChecked()

    await expect(page.getByTestId(PANEL_TOGGLE_TESTID)).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    await expect(page.getByTestId(SECTION_TESTID)).toBeVisible()
  })

  test("panel stays open after Clear filter", async ({ page }) => {
    await goToProperties(page)
    await expandPanel(page)

    // Select something so Clear is enabled, confirm it landed, then clear.
    await page.getByRole("checkbox", { name: OPT_COMING }).check()
    await expect(page.getByRole("checkbox", { name: OPT_COMING })).toBeChecked()

    await page.getByTestId(CLEAR_TESTID).click()

    await expect(page.getByTestId(PANEL_TOGGLE_TESTID)).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    await expect(page.getByTestId(SECTION_TESTID)).toBeVisible()
    // Selection was cleared, but the panel stayed open.
    expect(await getLocalStorage(page, LS_VALUES_KEY)).toBeNull()
  })

  test("an open panel is restored after a page reload", async ({ page }) => {
    await goToProperties(page)
    await expandPanel(page)
    expect(await getLocalStorage(page, LS_PANEL_KEY)).toBe("1")

    await page.reload()
    await page.getByTestId(CARD_TESTID).waitFor({ state: "visible" })

    await expect(page.getByTestId(PANEL_TOGGLE_TESTID)).toHaveAttribute(
      "aria-expanded",
      "true",
      { timeout: 10_000 },
    )
    await expect(page.getByTestId(SECTION_TESTID)).toBeVisible()
  })

  test("a collapsed panel stays collapsed after a page reload", async ({ page }) => {
    await goToProperties(page)
    await expandPanel(page)

    // Collapse it explicitly and confirm the choice is saved.
    await page.getByTestId(PANEL_TOGGLE_TESTID).click()
    await expect(page.getByTestId(PANEL_TOGGLE_TESTID)).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(await getLocalStorage(page, LS_PANEL_KEY)).toBe("0")

    await page.reload()
    await page.getByTestId(CARD_TESTID).waitFor({ state: "visible" })

    await expect(page.getByTestId(PANEL_TOGGLE_TESTID)).toHaveAttribute(
      "aria-expanded",
      "false",
      { timeout: 10_000 },
    )
  })
})
