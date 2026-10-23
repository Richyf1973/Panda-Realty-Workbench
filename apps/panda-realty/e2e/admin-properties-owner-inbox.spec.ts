import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  openPropertyEditDialog,
  PROPERTY_TWO_OWNERS,
  STATUS_LIST_RESPONSE,
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
} from "./helpers/panda-properties-owners-helpers"
import {
  mockGmailThreadsList,
  THREADS_RESPONSE,
  EMPTY_THREADS_RESPONSE,
} from "./helpers/panda-properties-gmail-helpers"

test.describe("Panda Realty — owner inbox panel (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")

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

  test("clicking inbox expands the entity threads panel for owner 1", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-inbox--1").click()

    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
  })

  test("clicking inbox again collapses the threads panel", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).not.toBeVisible()
  })

  test("threads panel shows thread subjects when api returns results", async ({ page }) => {
    await mockGmailThreadsList(page, THREADS_RESPONSE)
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-inbox--1").click()

    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-row")).toHaveCount(2)
  })

  test("threads panel shows empty state when no threads exist", async ({ page }) => {
    await mockGmailThreadsList(page, EMPTY_THREADS_RESPONSE)
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-inbox--1").click()

    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-row")).toHaveCount(0)
  })

  test("no gmail/threads request fires before inbox is first clicked", async ({ page }) => {
    let hitCount = 0
    await mockGmailThreadsList(page, THREADS_RESPONSE, { onHit: () => { hitCount++ } })
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    expect(hitCount).toBe(0)

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(hitCount).toBe(1)
  })

  test("collapsing and re-expanding inbox does not fire a second request", async ({ page }) => {
    let hitCount = 0
    await mockGmailThreadsList(page, THREADS_RESPONSE, { onHit: () => { hitCount++ } })
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(hitCount).toBe(1)

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).not.toBeVisible()

    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(hitCount).toBe(1)
  })

  test("gmail API error shows inline error in threads panel", async ({ page }) => {
    await mockGmailThreadsList(page, { error: "Gmail API unavailable" }, { status: 500 })
    await openPropertyEditDialog(page, PROPERTY_TWO_OWNERS)

    await page.getByTestId("property-owner-inbox--1").click()

    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByTestId("entity-threads-panel")).toContainText(/failed|error|unavailable/i)
    await expect(page.getByTestId("panda-properties-dialog-form")).toBeVisible()
  })
})
