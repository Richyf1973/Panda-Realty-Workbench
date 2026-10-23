/**
 * Buyers pipeline — calendar-month filter by `property_entities.created_at` (localStorage).
 * Live DB: globalSetup seeds fixtures when DATABASE_URL is set.
 */

import { expect, test } from "@playwright/test"

import { signInAsAdmin } from "./helpers/admin-auth"
import {
  buyersCardByAddressSnippet,
  gotoBuyersPipeline,
  PANDA_E2E_BUYERS_ANCIENT_SNIPPET,
  PANDA_E2E_BUYERS_SEED_SNIPPET,
} from "./helpers/panda-pipeline-panels"
import { requirePandaLiveE2eEnv } from "./helpers/require-panda-live-e2e-env"
import { PANDA_PIPELINE_BUYERS_MONTHS_STORAGE_KEY } from "../lib/buyers-pipeline-calendar-filter"

test.describe("Buyers pipeline calendar-month filter", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaLiveE2eEnv()
    await page.addInitScript((key: string) => {
      try {
        localStorage.setItem(key, "all")
      } catch {
        // ignore
      }
    }, PANDA_PIPELINE_BUYERS_MONTHS_STORAGE_KEY)
    await signInAsAdmin(page)
  })

  test("1 month preset hides ancient seed buyer; All time shows both", async ({ page }) => {
    await gotoBuyersPipeline(page)

    const recent = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_SEED_SNIPPET)
    const ancient = buyersCardByAddressSnippet(page, PANDA_E2E_BUYERS_ANCIENT_SNIPPET)

    await expect(recent.first()).toBeVisible({ timeout: 25_000 })
    await expect(ancient.first()).toBeVisible({ timeout: 25_000 })

    await page.getByTestId("pipeline-buyers-months-filter").click()
    await page.getByTestId("pipeline-buyers-months-filter-option--1").click()

    await expect.poll(async () => ancient.count(), { timeout: 15_000 }).toBe(0)
    await expect(recent.first()).toBeVisible()

    await page.getByTestId("pipeline-buyers-months-filter").click()
    await page.getByTestId("pipeline-buyers-months-filter-option--all").click()

    await expect.poll(async () => ancient.count(), { timeout: 15_000 }).toBeGreaterThan(0)
    await expect(ancient.first()).toBeVisible()
  })
})
