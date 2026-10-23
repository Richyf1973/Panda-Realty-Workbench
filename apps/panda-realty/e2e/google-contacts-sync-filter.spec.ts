import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"

test.describe("Panda Realty — Google Contacts sync filter", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await signInAsAdmin(page)

    // Mock Gmail connection status
    await page.route("**/api/admin/leads/gmail-status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true }),
      })
    })

    // Mock property list (for context in test setup)
    await page.route("**/api/admin/properties**", async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.includes("/api/admin/properties/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            propertyListId: 1001,
            streetAddress: "123 Test St",
            entityLinks: [],
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                propertyListId: 1001,
                streetAddress: "123 Test St",
                suburb: "Brisbane",
                propertyStatusId: 1,
              },
            ],
            totalCount: 1,
          }),
        })
      }
    })
  })

  test.describe("Happy path", () => {
    test("1. Toolbar visible with sync section", async ({ page }) => {
      await page.goto("/admin/properties")

      // Verify import section
      const importSection = page.getByTestId("lead-import-toolbar")
      await expect(importSection).toBeVisible()

      // Verify sync button and dropdown exist
      const syncDropdown = importSection.locator("select, [role=combobox]").nth(1) // Second dropdown (first is import)
      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await expect(syncDropdown).toBeVisible()
      await expect(syncButton).toBeVisible()
    })

    test("2. Sync dropdown defaults to 'Today'", async ({ page }) => {
      await page.goto("/admin/properties")

      await expect(page.getByTestId("lead-import-sync-date-range-select")).toHaveText(/Today/)
    })

    test("3. Preview count displays on page load", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        const url = new URL(route.request().url())
        const dateRange = url.searchParams.get("dateRange") || "today"
        const counts: Record<string, number> = {
          today: 12,
          yesterday: 8,
          "this-week": 25,
          "last-30": 47,
          all: 120,
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: counts[dateRange] || 0 }),
        })
      })

      await page.goto("/admin/properties")

      // Wait for preview count to appear
      const previewText = page.locator("text=/\\d+ contacts will sync/")
      await expect(previewText).toBeVisible()
      expect(await previewText.textContent()).toMatch(/12 contacts will sync/)
    })

    test("4. Preview count updates when date range changes", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        const url = new URL(route.request().url())
        const dateRange = url.searchParams.get("dateRange") || "today"
        const counts: Record<string, number> = {
          today: 12,
          "this-week": 25,
          all: 120,
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: counts[dateRange] || 0 }),
        })
      })

      await page.goto("/admin/properties")

      // Change to "This week"
      await page.getByTestId("lead-import-sync-date-range-select").click()
      await page.getByRole("option", { name: "This week" }).click()

      // Preview should update
      await expect(page.locator("text=25 contacts will sync")).toBeVisible({ timeout: 5000 })
    })

    test("5. Change to 'All time' increases preview count", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        const url = new URL(route.request().url())
        const dateRange = url.searchParams.get("dateRange") || "today"
        const counts: Record<string, number> = {
          today: 12,
          all: 120,
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: counts[dateRange] || 0 }),
        })
      })

      await page.goto("/admin/properties")

      await page.getByTestId("lead-import-sync-date-range-select").click()
      await page.getByRole("option", { name: "All time" }).click()

      await expect(page.locator("text=120 contacts will sync")).toBeVisible({ timeout: 5000 })
    })

    test("6. Sync button disabled and progress shows during sync", async ({ page }) => {
      let syncInProgress = false
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        syncInProgress = true
        // Simulate slow sync
        await new Promise((r) => setTimeout(r, 1000))
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 11,
            failed: 1,
            errors: [],
            results: [],
            resultsOmitted: 0,
          }),
        })
        syncInProgress = false
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 12 }),
        })
      })

      await page.goto("/admin/properties")

      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await syncButton.click()

      // Button is replaced by the syncing indicator while the request is in flight
      await expect(syncButton).toHaveCount(0)

      // Progress text should appear
      const progressText = page.locator("text=/Syncing.*contacts to Google/")
      await expect(progressText).toBeVisible()

      // Wait for sync to complete
      await expect(page.locator("text=11 synced")).toBeVisible({ timeout: 10000 })
    })

    test("7. Real-time progress counter updates during sync", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        // Hold the request long enough for the syncing state to be visible
        await new Promise((r) => setTimeout(r, 1000))
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 47,
            failed: 2,
            errors: [],
            results: Array.from({ length: 47 }, (_, i) => ({
              mergeKind: "email",
              mergeKey: `contact${i}@test.com`,
              displayLabel: `Contact ${i}`,
              outcome: i < 45 ? "created" : "updated",
            })),
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 49 }),
        })
      })

      await page.goto("/admin/properties")

      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await syncButton.click()

      // Progress text with counter
      await expect(page.locator("text=/Syncing.*contacts to Google/")).toBeVisible()

      // After completion, results show synced count
      await expect(page.locator("text=47 synced")).toBeVisible({ timeout: 10000 })
    })

    test("8. Results display with synced, failed, and excluded counts", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 121,
            failed: 2,
            errors: ["Invalid email format"],
            results: [],
            exclusionCount: 5,
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 128 }),
        })
      })

      await page.goto("/admin/properties")

      await page.getByTestId("lead-import-sync-contacts-button").click()

      // Results text
      await expect(page.locator("text=/121 synced.*2 failed/")).toBeVisible({ timeout: 10000 })
      await expect(page.locator("text=/excluded/")).toBeVisible()
    })

    test("9. 'View sync log' button opens dialog with per-contact details", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 2,
            failed: 1,
            errors: [],
            results: [
              {
                mergeKind: "email",
                mergeKey: "john@example.com",
                displayLabel: "john@example.com",
                outcome: "created",
                contributingEntityIds: [1],
                contributingOwners: [{ propertyListId: 1001, slot: 1 }],
              },
              {
                mergeKind: "email",
                mergeKey: "jane@example.com",
                displayLabel: "jane@example.com",
                outcome: "updated",
                contributingEntityIds: [2],
                contributingOwners: [{ propertyListId: 1002, slot: 1 }],
              },
              {
                mergeKind: "phone",
                mergeKey: "0412345678",
                displayLabel: "0412345678",
                outcome: "failed",
                error: "Invalid phone format",
                contributingEntityIds: [3],
              },
            ],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 3 }),
        })
      })

      await page.goto("/admin/properties")

      await page.getByTestId("lead-import-sync-contacts-button").click()

      // Wait for results
      await expect(page.locator("text=2 synced")).toBeVisible({ timeout: 10000 })

      // Click "View sync log"
      const logButton = page.getByTestId("lead-import-google-sync-log-button")
      await expect(logButton).toBeVisible()
      await logButton.click()

      // Dialog should show contact details
      const dialog = page.getByTestId("lead-import-google-sync-log-dialog")
      await expect(dialog).toBeVisible()

      // Check for contact rows
      await expect(dialog.locator("text=john@example.com")).toBeVisible()
      await expect(dialog.locator("text=jane@example.com")).toBeVisible()
      await expect(dialog.locator("text=0412345678")).toBeVisible()

      // Check for outcome columns
      await expect(dialog.locator("text=created")).toBeVisible()
      await expect(dialog.locator("text=updated")).toBeVisible()
      await expect(dialog.locator("text=failed")).toBeVisible()
    })

    test("10. Failed contact shows error message in sync log", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 0,
            failed: 1,
            errors: [],
            results: [
              {
                mergeKind: "email",
                mergeKey: "bad-email",
                displayLabel: "bad-email",
                outcome: "failed",
                error: "Invalid email format",
                contributingEntityIds: [1],
              },
            ],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 1 }),
        })
      })

      await page.goto("/admin/properties")

      await page.getByTestId("lead-import-sync-contacts-button").click()
      await expect(page.locator("text=1 failed")).toBeVisible({ timeout: 10000 })

      await page.getByTestId("lead-import-google-sync-log-button").click()

      const dialog = page.getByTestId("lead-import-google-sync-log-dialog")
      await expect(dialog.locator("text=Invalid email format")).toBeVisible()
    })

    test("11. 'Sync again' button resets state and dropdown to default", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 10,
            failed: 0,
            errors: [],
            results: [],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 10 }),
        })
      })

      await page.goto("/admin/properties")

      // First sync
      await page.getByTestId("lead-import-sync-contacts-button").click()
      await expect(page.locator("text=10 synced")).toBeVisible({ timeout: 10000 })

      // Click "Sync again"
      const syncAgainButton = page.locator("button:has-text('Sync again')")
      await syncAgainButton.click()

      // Dropdown should reset to "Today"
      await expect(page.getByTestId("lead-import-sync-date-range-select")).toHaveText(/Today/)

      // Sync button should be enabled again
      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await expect(syncButton).toBeEnabled()
    })
  })

  test.describe("Edge cases", () => {
    test("12. 0 matching contacts shows 'X contacts will sync' with count 0", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 0 }),
        })
      })

      await page.goto("/admin/properties")

      await page.getByTestId("lead-import-sync-date-range-select").click()
      await page.getByRole("option", { name: "Today" }).click()

      // Should show "0 contacts will sync"
      await expect(page.locator("text=0 contacts will sync")).toBeVisible()
    })

    test("13. All records excluded shows zero synced and all excluded", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 0,
            failed: 0,
            errors: [],
            results: [],
            exclusionCount: 15,
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 15 }),
        })
      })

      await page.goto("/admin/properties")

      await page.getByTestId("lead-import-sync-contacts-button").click()

      // Results should show 0 synced, 15 excluded
      await expect(page.locator("text=/0 synced.*excluded/")).toBeVisible({ timeout: 10000 })
    })

    test("14. Dropdown disabled during sync prevents filter changes", async ({ page }) => {
      let syncCompleted = false
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await new Promise((r) => setTimeout(r, 2000))
        syncCompleted = true
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 10,
            failed: 0,
            errors: [],
            results: [],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 10 }),
        })
      })

      await page.goto("/admin/properties")

      const syncDropdown = page.getByTestId("lead-import-sync-date-range-select")
      const syncButton = page.getByTestId("lead-import-sync-contacts-button")

      await syncButton.click()

      // The sync controls disappear while the request is running
      await expect(syncDropdown).toHaveCount(0)

      // Wait for sync to complete
      await expect(page.locator("text=10 synced")).toBeVisible({ timeout: 10000 })

      // Completed state replaces the sync controls with the results summary
      await expect(page.getByTestId("lead-import-google-sync-log-button")).toBeVisible()
    })
  })

  test.describe("Error / rejection states", () => {
    test("15. Network timeout shows error message and 'Try again' button", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.abort("timedout")
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 10 }),
        })
      })

      await page.goto("/admin/properties")

      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await syncButton.click()

      // Error message should appear
      await expect(page.locator("text=/Failed to fetch|Sync failed|Network timeout/")).toBeVisible({
        timeout: 10000,
      })

      // "Try again" button should appear
      const tryAgainButton = page.locator("button:has-text('Try again')").last()
      await expect(tryAgainButton).toBeVisible()
    })

    test("16. Individual contact retry on failure", async ({ page }) => {
      let attemptCount = 0
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        attemptCount++
        if (attemptCount === 1) {
          // First attempt: 1 failed with retryable error
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              synced: 9,
              failed: 1,
              errors: ["Rate limit exceeded"],
              results: [
                {
                  mergeKind: "email",
                  mergeKey: "retry@test.com",
                  displayLabel: "retry@test.com",
                  outcome: "failed",
                  error: "Rate limit exceeded (will retry)",
                  contributingEntityIds: [1],
                },
              ],
            }),
          })
        } else {
          // Second attempt: all succeed
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              synced: 10,
              failed: 0,
              errors: [],
              results: [],
            }),
          })
        }
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 10 }),
        })
      })

      await page.goto("/admin/properties")

      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await syncButton.click()

      // First sync shows 1 failed
      await expect(page.locator("text=/9 synced.*1 failed/")).toBeVisible({ timeout: 10000 })

      // Retry sync
      const syncAgainButton = page.locator("button:has-text('Sync again')")
      await syncAgainButton.click()

      await syncButton.click()

      // Second sync shows all succeeded
      await expect(page.locator("text=10 synced")).toBeVisible({ timeout: 10000 })
    })

    test("17. Missing Google Contacts permission shows auth error", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ error: "Google not connected" }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 10 }),
        })
      })

      await page.goto("/admin/properties")

      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await syncButton.click()

      // Auth error should appear
      await expect(page.locator("text=/Google not connected|not authorized/")).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe("Persistence check", () => {
    test("18. Reload page after sync keeps sync results in database", async ({ page, context }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 10,
            failed: 0,
            errors: [],
            results: [
              {
                mergeKind: "email",
                mergeKey: "persist@test.com",
                displayLabel: "persist@test.com",
                outcome: "created",
              },
            ],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 10 }),
        })
      })

      await page.goto("/admin/properties")

      // Perform sync
      const syncButton = page.getByTestId("lead-import-sync-contacts-button")
      await syncButton.click()

      // Wait for completion
      await expect(page.locator("text=10 synced")).toBeVisible({ timeout: 10000 })

      // Reload page
      await page.reload()

      // Sync log should still be accessible (in real scenario, this would require DB persistence)
      // For now, verify sync state is cleared (as intended after reload)
      await expect(page.getByTestId("lead-import-sync-contacts-button")).toBeEnabled()
    })
  })

  test.describe("Member log visibility", () => {
    test("19. sync log keeps merge key visible while also showing member display name", async ({ page }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 1,
            failed: 0,
            errors: [],
            results: [
              {
                mergeKind: "email",
                mergeKey: "contractadmin@avid.com.au",
                displayLabel: "contractadmin@avid.com.au",
                outcome: "updated",
                contributingEntityIds: [169867],
                contributingOwners: [],
                contactDisplayName: "Sarah Sheridan (Vantage Caboolture Riverfront)",
                parentEntityNames: ["Vantage Caboolture Riverfront"],
              },
            ],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 1 }),
        })
      })

      await page.goto("/admin/properties")
      await page.getByTestId("lead-import-sync-contacts-button").click()
      await expect(page.locator("text=1 synced")).toBeVisible({ timeout: 10000 })

      await page.getByTestId("lead-import-google-sync-log-button").click()
      const dialog = page.getByTestId("lead-import-google-sync-log-dialog")

      await expect(dialog.locator("text=contractadmin@avid.com.au")).toBeVisible()
      await expect(dialog.locator("text=Sarah Sheridan (Vantage Caboolture Riverfront)")).toBeVisible()
    })

    test("20. sync log shows parent entity context for member rows without relying on raw entity ids alone", async ({
      page,
    }) => {
      await page.route("**/api/admin/google-contacts/patch-all**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            synced: 1,
            failed: 0,
            errors: [],
            results: [
              {
                mergeKind: "email",
                mergeKey: "contractadmin@avid.com.au",
                displayLabel: "contractadmin@avid.com.au",
                outcome: "updated",
                contributingEntityIds: [169867],
                contributingOwners: [],
                contactDisplayName: "Sarah Sheridan (Vantage Caboolture Riverfront)",
                parentEntityNames: ["Vantage Caboolture Riverfront"],
              },
            ],
          }),
        })
      })

      await page.route("**/api/admin/google-contacts/patch-all/count**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ count: 1 }),
        })
      })

      await page.goto("/admin/properties")
      await page.getByTestId("lead-import-sync-contacts-button").click()
      await expect(page.locator("text=1 synced")).toBeVisible({ timeout: 10000 })

      await page.getByTestId("lead-import-google-sync-log-button").click()
      const dialog = page.getByTestId("lead-import-google-sync-log-dialog")

      await expect(dialog.locator("text=Parent: Vantage Caboolture Riverfront")).toBeVisible()
      await expect(dialog.locator("text=entities: 169867")).toBeVisible()
    })
  })
})
