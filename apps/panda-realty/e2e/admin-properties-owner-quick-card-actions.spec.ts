import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"
import { gotoPropertiesQuickCards, STATUS_LIST_RESPONSE, EMPTY_LIST_RESPONSE } from "./helpers/panda-properties-quick-cards-nav"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const BASE_ITEM = {
  propertyListId: 9001,
  streetAddress: "12 OWNER ACTION ROAD",
  suburb: "TESTVILLE",
  state: "QLD",
  postcode: "4000",
  propertyType: "House",
  bed: 3,
  bath: 2,
  car: 1,
  buildingArea: 180,
  salePrice: 550000,
  saleDate: null,
  propertyStatusId: 1,
  buyerName: null,
  buyerId: null,
  isFavorite: false,
  priceUndisclosed: false,
  excludeFromReport: false,
  updatedAt: "2026-01-01T00:00:00Z",
  // owner fields returned by list API after promotion to list:true
  owner1name: null,
  owner1phone: null,
  owner1email: null,
  owner2name: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  combinedOwner: null,
  contractPrice: null,
  successfulBuyer: null,
}

function makeQuickListResponse(overrides: Record<string, unknown>) {
  return {
    items: [{ ...BASE_ITEM, ...overrides }],
    totalCount: 1,
    limit: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function requireAuth(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).")
  }
}

async function gotoQuickCards(
  page: import("@playwright/test").Page,
  listResponse: object,
) {
  await gotoPropertiesQuickCards(page, listResponse, "Owner Action Road~QLD")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Properties quick card — per-owner action rows", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth()
    await page.setViewportSize({ width: 1280, height: 800 })
    await signInAsAdmin(page)
  })

  // ── Owner rows appear ────────────────────────────────────────────────────

  test("Two owner rows shown for property with two non-empty owner names", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: "j_jwatt@bigpond.com",
      owner2name: "JANIS MERLE WATT",
      owner2phone: null,
      owner2email: null,
      combinedOwner: "JEFFREY RONALD WATT / JANIS MERLE WATT",
    }))
    await expect(page.getByTestId("property-owner-row--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-row--2")).toBeVisible()
    await expect(page.getByTestId("property-owner-row--3")).toHaveCount(0)
  })

  test("Owner row shows the owner's name", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await expect(page.getByTestId("property-owner-row--1")).toContainText("JEFFREY RONALD WATT")
  })

  test("Owner row shows add event and add note actions", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      propertyListId: 9001,
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await expect(page.getByTestId("property-owner-add-event--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-add-note--1")).toBeVisible()
  })

  test("Owner add event opens the meeting dialog with owner-prefilled title", async ({ page }) => {
    await page.route("**/api/admin/calendar/status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ connected: true }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      propertyListId: 9001,
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await page.getByTestId("property-owner-add-event--1").click()
    await expect(page.getByTestId("add-meeting-dialog")).toBeVisible()
    await expect(page.getByTestId("meeting-title-input")).toHaveValue(
      "Meeting with JEFFREY RONALD WATT",
    )
  })

  test("Owner add note opens the property note dialog with owner context in the subtitle", async ({ page }) => {
    await page.route("**/api/admin/agents/options", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    })
    await page.route("**/api/admin/properties/9001", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ propertyBuyers: [] }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      propertyListId: 9001,
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await page.getByTestId("property-owner-add-note--1").click()
    await expect(page.getByTestId("property-list-add-note-dialog")).toBeVisible()
    await expect(page.getByTestId("property-list-add-note-subtitle")).toContainText(
      "Owner 1 - JEFFREY RONALD WATT",
    )
  })

  test("No owner rows shown when all owner name slots are empty", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({ combinedOwner: null }))
    await expect(page.getByTestId("property-owner-row--1")).toHaveCount(0)
    await expect(page.getByTestId("property-owner-row--2")).toHaveCount(0)
  })

  // ── Call button ──────────────────────────────────────────────────────────

  test("Call button is present when owner has phone", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: null,
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await expect(page.getByTestId("property-owner-quick-call--1")).toBeVisible()
  })

  test("Call button has correct tel: href", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: null,
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    const callBtn = page.getByTestId("property-owner-quick-call--1")
    await expect(callBtn).toHaveAttribute("href", "tel:0417375738")
  })

  test("Call button is visible but disabled when owner has no phone", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JANIS MERLE WATT",
      owner1phone: null,
      owner1email: "janis@example.com",
      combinedOwner: "JANIS MERLE WATT",
    }))
    await expect(page.getByTestId("property-owner-quick-call--1")).toBeDisabled()
  })

  // ── Email button ─────────────────────────────────────────────────────────

  test("Email button is present when owner has email", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: null,
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await expect(page.getByTestId("property-owner-quick-email--1")).toBeVisible()
  })

  test("Email button is visible but disabled when owner has no email", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JANIS MERLE WATT",
      owner1phone: "0417375738",
      owner1email: null,
      combinedOwner: "JANIS MERLE WATT",
    }))
    await expect(page.getByTestId("property-owner-quick-email--1")).toBeDisabled()
  })

  // ── Inbox button ─────────────────────────────────────────────────────────

  test("Inbox button is present when owner has email", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: null,
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
  })

  test("Inbox button is visible but disabled when owner has no email", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JANIS MERLE WATT",
      owner1phone: "0417375738",
      owner1email: null,
      combinedOwner: "JANIS MERLE WATT",
    }))
    await expect(page.getByTestId("property-owner-inbox--1")).toBeDisabled()
  })

  test("Inbox button expands the entity threads panel for owner 1", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/threads/body") || route.request().url().includes("/threads/attachment")) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ threads: [
          { threadId: "t1", subject: "Re: 12 Owner Action Road", from: "j_jwatt@bigpond.com", date: "2026-01-01T00:00:00Z", snippet: "Test snippet", attachmentCount: 0 },
        ] }),
      })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: null,
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    const inboxBtn = page.getByTestId("property-owner-inbox--1")
    await expect(inboxBtn).toBeVisible()
    await expect(page.getByTestId("entity-threads-panel")).toHaveCount(0)
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await expect(page.getByTestId("gmail-thread-row")).toHaveCount(1)
  })

  test("Inbox button collapses the threads panel on second click", async ({ page }) => {
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/threads/body") || route.request().url().includes("/threads/attachment")) {
        await route.continue()
        return
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: null,
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    const inboxBtn = page.getByTestId("property-owner-inbox--1")
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    await inboxBtn.click()
    await expect(page.getByTestId("entity-threads-panel")).not.toBeVisible()
  })

  test("Threads panel fetches with the owner's email address", async ({ page }) => {
    let capturedEmail: string | null = null
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/threads/body") || route.request().url().includes("/threads/attachment")) {
        await route.continue()
        return
      }
      capturedEmail = new URL(route.request().url()).searchParams.get("email")
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: null,
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(capturedEmail).toBe("j_jwatt@bigpond.com")
  })

  test("No threads request fires before inbox is first clicked", async ({ page }) => {
    let hitCount = 0
    await page.route("**/api/admin/gmail/threads**", async (route) => {
      if (route.request().url().includes("/threads/body") || route.request().url().includes("/threads/attachment")) {
        await route.continue()
        return
      }
      hitCount++
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ threads: [] }) })
    })
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: null,
      owner1email: "j_jwatt@bigpond.com",
      combinedOwner: "JEFFREY RONALD WATT",
    }))
    expect(hitCount).toBe(0)
    await page.getByTestId("property-owner-inbox--1").click()
    await expect(page.getByTestId("entity-threads-panel")).toBeVisible()
    expect(hitCount).toBe(1)
  })

  // ── No action buttons when no phone AND no email ─────────────────────────

  test("All owner action buttons stay visible but disabled when owner has only a name", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JANIS MERLE WATT",
      owner1phone: null,
      owner1email: null,
      combinedOwner: "JANIS MERLE WATT",
    }))
    await expect(page.getByTestId("property-owner-row--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-quick-call--1")).toBeDisabled()
    await expect(page.getByTestId("property-owner-quick-email--1")).toBeDisabled()
    await expect(page.getByTestId("property-owner-inbox--1")).toBeDisabled()
  })

  test("Disabled owner action buttons explain why via tooltip", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JANIS MERLE WATT",
      owner1phone: null,
      owner1email: null,
      combinedOwner: "JANIS MERLE WATT",
    }))
    await page.getByTestId("property-owner-quick-call-trigger--1").focus()
    await expect(page.getByRole("tooltip", { name: "No phone number" })).toBeVisible()
    await page.getByTestId("property-owner-quick-email-trigger--1").focus()
    await expect(page.getByRole("tooltip", { name: "No email address" })).toBeVisible()
  })

  // ── Multiple owners with mixed data ─────────────────────────────────────

  test("Owner 1 gets call+email+inbox, owner 2 gets only name (no contact info)", async ({ page }) => {
    await gotoQuickCards(page, makeQuickListResponse({
      owner1name: "JEFFREY RONALD WATT",
      owner1phone: "0417375738",
      owner1email: "j_jwatt@bigpond.com",
      owner2name: "JANIS MERLE WATT",
      owner2phone: null,
      owner2email: null,
      combinedOwner: "JEFFREY RONALD WATT / JANIS MERLE WATT",
    }))
    await expect(page.getByTestId("property-owner-quick-call--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-quick-email--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-inbox--1")).toBeVisible()
    await expect(page.getByTestId("property-owner-row--2")).toBeVisible()
    await expect(page.getByTestId("property-owner-quick-call--2")).toBeDisabled()
    await expect(page.getByTestId("property-owner-quick-email--2")).toBeDisabled()
    await expect(page.getByTestId("property-owner-inbox--2")).toBeDisabled()
  })

  // ── Default table mode unaffected ────────────────────────────────────────

  test("Owner action rows do not appear in default table mode (no filters)", async ({ page }) => {
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/properties**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) })
    })
    await page.goto("/admin/properties")
    await expect(page.getByTestId("admin-entity-table-scroll--properties")).toBeVisible()
    await expect(page.getByTestId("admin-entity-quick-cards-scroll--properties")).toHaveCount(0)
    await expect(page.getByTestId("property-owner-row--1")).toHaveCount(0)
  })
})
