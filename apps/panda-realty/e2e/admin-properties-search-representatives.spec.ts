/**
 * E2E (LIVE): Properties board general search includes representatives.
 *
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/admin-properties-search-representatives.spec.ts" --no-bail
 *
 * Feature 1: the property board generalSearch now also matches a linked contact's
 * representatives (panda_realty.entity_members) by name, email, or phone.
 *
 * Seed (live DB): representative "Eugene McAuley" under contact "McAuley Law"
 * (entity 169814, category Contact), linked to favorite property
 * 186834 — "180 /46 AMY STREET". Before this feature, searching "Eugene" on the
 * board returned nothing because only the entity's own name/email/contact was searched.
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
  "search-representatives",
)

const story = createStory({
  specUrl: import.meta.url,
  slug: "search-representatives",
})

story.setWhatWasBuilt(
  "Property board general search now also matches representatives (panda_realty.entity_members) " +
    "of a linked contact — by member name, email, or phone — via an EXISTS subquery added to the " +
    "generalSearch block in pandaPropertiesAppendListWhere. Searching a representative like " +
    "\"Eugene\" now surfaces the property linked to that rep's parent contact.",
)

const REP_NAME = "Eugene"
const REP_EMAIL = "eugene@mcauleylaw.com.au"
// Member-only phone: rep "Mitty McCabe" of contact "Thyme Morayfield" (also linked to the
// target property). This phone is NOT on any entity's own contact/mobile column, owner, or
// note — so before the feature it matches nothing; only a representative-phone search finds it.
const REP_PHONE = "0423 952 652"
const TARGET_ADDRESS = "180 /46 AMY STREET"

test.beforeEach(async ({ page }) => {
  requirePandaLiveE2eEnv()
  await mkdir(SHOT_DIR, { recursive: true })
  await signInAsAdmin(page)
})

test.afterAll(() => {
  story.write()
})

async function searchBoard(page: import("@playwright/test").Page, term: string) {
  await page.goto(`/admin/properties?generalSearch=${encodeURIComponent(term)}`)
  await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({
    timeout: 20_000,
  })
  // Search input reflects the active term (favorites view is the default).
  await expect(page.getByTestId("properties-general-search-input")).toHaveValue(term)
}

test("searching a representative NAME surfaces the linked property", async ({ page }) => {
  await searchBoard(page, REP_NAME)

  const result = page.getByText(TARGET_ADDRESS, { exact: false })
  await expect(result).toBeVisible({ timeout: 20_000 })

  await shotFocused(
    page,
    page.getByTestId("admin-entity-list-card--properties"),
    SHOT_DIR,
    "01-rep-name-surfaces-property",
  )
  story.addScene({
    title: "01 — Search rep name surfaces linked property",
    images: [join(SHOT_DIR, "01-rep-name-surfaces-property.png")],
    seeing:
      `Searching "${REP_NAME}" (a representative of contact "McAuley Law") on the property ` +
      `board returns property "${TARGET_ADDRESS}", which is linked to that contact. Before ` +
      "this feature the board ignored representatives and returned nothing.",
    steps: [
      "Sign in as admin",
      `Open the Properties board with generalSearch=${REP_NAME}`,
      `Confirm "${TARGET_ADDRESS}" appears in the results`,
    ],
  })
})

test("searching a representative EMAIL surfaces the linked property", async ({ page }) => {
  await searchBoard(page, REP_EMAIL)
  await expect(page.getByText(TARGET_ADDRESS, { exact: false })).toBeVisible({
    timeout: 20_000,
  })
})

test("searching a representative PHONE surfaces the linked property", async ({ page }) => {
  await searchBoard(page, REP_PHONE)
  await expect(page.getByText(TARGET_ADDRESS, { exact: false })).toBeVisible({
    timeout: 20_000,
  })
})

test("a nonsense term returns no matching property (no false positives)", async ({ page }) => {
  await searchBoard(page, "zzzznotarealrepnamexyz")
  await expect(page.getByText(TARGET_ADDRESS, { exact: false })).toHaveCount(0)
})

test("special characters in the search do not crash the board", async ({ page }) => {
  await page.goto(`/admin/properties?generalSearch=${encodeURIComponent("%_\\")}`)
  await expect(page.getByTestId("admin-entity-list-card--properties")).toBeVisible({
    timeout: 20_000,
  })
})
