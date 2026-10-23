/**
 * E2E (LIVE): Separate Contacts search page.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-contacts-search.spec.ts" --no-bail
 *
 * Feature 2: a dedicated "Contacts" page — the Entities admin grid pre-filtered to the
 * Contact category (entity_category_id = 4) — whose search also matches representatives
 * (panda_realty.entity_members). Typing a representative name (e.g. "Eugene") finds that
 * rep's parent contact ("McAuley Law"). Clicking a result opens the contact edit dialog.
 *
 * Seed (live DB): contact "McAuley Law" (entity 169814, category Contact) with
 * representative "Eugene McAuley" (eugene@mcauleylaw.com.au / 0478 848 131).
 *
 * Uses the live admin API (no route mocks) — requires E2E_ADMIN_* + DATABASE_URL.
 */

import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { createStory, shotFocused } from "@repo/e2e-utils"

import { signInAsAdmin } from "./helpers/admin-auth"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"

const SHOT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "screenshots",
  "contacts-search",
)

const story = createStory({ specUrl: import.meta.url, slug: "contacts-search" })

story.setWhatWasBuilt(
  "A separate Contacts page: a new admin list (slug \"contacts\") over panda_realty.entities, " +
    "locked to the Contact category, reachable from a new \"Contacts\" sidebar item. Its general " +
    "search matches the contact's own fields AND its representatives (entity_members) by name, " +
    "email, or phone, so a rep name like \"Eugene\" finds the parent contact \"McAuley Law\". " +
    "Clicking a result opens the existing contact edit dialog.",
)

const CONTACT_ENTITY_ID = 169814
const CONTACT_NAME = "McAuley Law"

test.beforeEach(async ({ page }) => {
  requirePandaLiveE2eEnv()
  await mkdir(SHOT_DIR, { recursive: true })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

test("Contacts nav link exists and opens the Contacts page", async ({ page }) => {
  await page.goto("/admin/properties")
  // Contacts lives under the Master List section — expand it if collapsed.
  const masterToggle = page.getByTestId("admin-sidebar-master-list-toggle")
  if (await masterToggle.isVisible().catch(() => false)) {
    await masterToggle.click()
  }
  const navLink = page.getByTestId("admin-layout-nav-link--contacts")
  await expect(navLink).toBeVisible({ timeout: 10_000 })
  await navLink.click()
  await expect(page).toHaveURL(/\/admin\/contacts/)
  await expect(page.getByTestId("admin-entity-list-card--contacts")).toBeVisible({
    timeout: 20_000,
  })
})

test("Contacts page loads with the contacts list", async ({ page }) => {
  await page.goto("/admin/contacts")
  await expect(page.getByTestId("admin-entity-page")).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId("admin-entity-list-card--contacts")).toBeVisible({
    timeout: 20_000,
  })
})

test("searching a business name finds the contact", async ({ page }) => {
  await page.goto(`/admin/contacts?generalSearch=${encodeURIComponent("McAuley")}`)
  await expect(page.getByTestId("admin-entity-list-card--contacts")).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText(CONTACT_NAME, { exact: false })).toBeVisible({
    timeout: 20_000,
  })
})

test("searching a REPRESENTATIVE name finds the parent contact", async ({ page }) => {
  await page.goto(`/admin/contacts?generalSearch=${encodeURIComponent("Eugene")}`)
  await expect(page.getByTestId("admin-entity-list-card--contacts")).toBeVisible({
    timeout: 20_000,
  })

  const contact = page.getByText(CONTACT_NAME, { exact: false })
  await expect(contact).toBeVisible({ timeout: 20_000 })

  await shotFocused(
    page,
    page.getByTestId("admin-entity-list-card--contacts"),
    SHOT_DIR,
    "01-rep-name-finds-contact",
  )
  story.addScene({
    title: "01 — Rep name finds the parent contact",
    images: [join(SHOT_DIR, "01-rep-name-finds-contact.png")],
    seeing:
      `On the Contacts page, searching "Eugene" (a representative, not the contact's own ` +
      `name) surfaces the parent contact "${CONTACT_NAME}".`,
    steps: [
      "Open the Contacts page",
      "Search Eugene",
      `Confirm "${CONTACT_NAME}" appears`,
    ],
  })
})

test("searching a representative email or phone finds the contact", async ({ page }) => {
  await page.goto(
    `/admin/contacts?generalSearch=${encodeURIComponent("eugene@mcauleylaw.com.au")}`,
  )
  await expect(page.getByText(CONTACT_NAME, { exact: false })).toBeVisible({
    timeout: 20_000,
  })

  await page.goto(`/admin/contacts?generalSearch=${encodeURIComponent("0478 848 131")}`)
  await expect(page.getByText(CONTACT_NAME, { exact: false })).toBeVisible({
    timeout: 20_000,
  })
})

test("clicking a contact result opens the contact edit dialog", async ({ page }) => {
  await page.goto(`/admin/contacts?generalSearch=${encodeURIComponent("McAuley")}`)
  await expect(page.getByTestId("admin-entity-list-card--contacts")).toBeVisible({
    timeout: 20_000,
  })

  await page.getByTestId(`admin-entity-row-edit--contacts--${CONTACT_ENTITY_ID}`).click()
  await expect(page.getByTestId("admin-entity-crud-dialog--contacts")).toBeVisible({
    timeout: 15_000,
  })
})
