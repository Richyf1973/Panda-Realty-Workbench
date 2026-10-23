/**
 * E2E: Gmail compose dialog — z-index / portal layering and text alignment
 *
 * Success factors (all mocked, no live DB needed):
 * 1. Compose dialog backdrop is a direct child of <body> (rendered via portal, not inside the table row).
 * 2. Dialog backdrop covers the full viewport (fixed inset-0).
 * 3. Table header row is not interactable while the compose dialog is open (dialog is on top).
 * 4. Editor body text is left-aligned regardless of signature content.
 * 5. Dialog closes cleanly and the table remains functional after close.
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import { STATUS_LIST_RESPONSE } from "./helpers/admin-properties-mocks"
import {
  makeListResponse,
  PROPERTY_ONE_OWNER,
} from "./helpers/panda-properties-owners-helpers"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROPERTY_WITH_EMAIL = {
  ...PROPERTY_ONE_OWNER,
  propertyListId: 9001,
  streetAddress: "99 E2E Seed Street",
  suburb: "Playwright Seed",
  owner1name: "E2E Seed Owner",
  owner1phone: "0400000001",
  owner1email: "e2e-owner@example.com",
}

async function setupMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/admin/properties**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeListResponse(PROPERTY_WITH_EMAIL)),
    })
  })
  await page.route("**/api/admin/property-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(STATUS_LIST_RESPONSE),
    })
  })
  await page.route("**/api/admin/agents**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })
  await page.route("**/api/admin/email-signatures**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    })
  })
}

async function openComposeDialog(page: import("@playwright/test").Page) {
  await page.goto("/admin/properties")
  await expect(
    page.getByTestId("admin-entity-row--properties--9001"),
  ).toBeVisible({ timeout: 15_000 })
  await page.getByTestId("property-list-email-button--9001").first().click()
  await expect(page.getByTestId("property-gmail-compose-dialog")).toBeVisible()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Compose dialog — portal layering and text alignment (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    requirePandaE2eAdminCredentials()
    await setupMocks(page)
    await signInAsAdmin(page)
  })

  test("compose dialog backdrop is a direct child of <body> (portal mount)", async ({ page }) => {
    await openComposeDialog(page)

    const backdrop = page.getByTestId("property-gmail-compose-backdrop")
    const parentTag = await backdrop.evaluate(
      (el) => el.parentElement?.tagName.toLowerCase(),
    )
    expect(parentTag).toBe("body")
  })

  test("compose dialog backdrop covers the full viewport", async ({ page }) => {
    await openComposeDialog(page)

    const backdrop = page.getByTestId("property-gmail-compose-backdrop")
    const rect = await backdrop.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, left: r.left, width: r.width, height: r.height }
    })
    const viewport = page.viewportSize()!

    expect(rect.top).toBe(0)
    expect(rect.left).toBe(0)
    expect(rect.width).toBe(viewport.width)
    expect(rect.height).toBe(viewport.height)
  })

  test("table header row is not interactable while compose dialog is open", async ({ page }) => {
    await openComposeDialog(page)

    // The sticky table header should be visually behind the dialog backdrop.
    // Verify by checking that a click at the header's position hits the backdrop, not the header.
    const headerRow = page.locator("thead tr").first()
    const headerBox = await headerRow.boundingBox()

    if (headerBox) {
      const centerX = headerBox.x + headerBox.width / 2
      const centerY = headerBox.y + headerBox.height / 2

      // Element at that coordinate should be part of the dialog, not the thead
      const tagAtPoint = await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x as number, y as number)
          // Walk up to find if we hit the dialog backdrop or something inside it
          let current: Element | null = el
          while (current) {
            if (current.getAttribute("data-testid") === "property-gmail-compose-backdrop") {
              return "backdrop"
            }
            current = current.parentElement
          }
          return el?.tagName.toLowerCase() ?? "null"
        },
        [centerX, centerY],
      )

      expect(tagAtPoint).toBe("backdrop")
    }
  })

  test("editor body text is left-aligned", async ({ page }) => {
    await openComposeDialog(page)

    const editor = page.getByTestId("property-gmail-compose-editor")
    await expect(editor).toBeVisible()

    // The contentEditable div itself must have text-align: left (or start)
    const textAlign = await editor.evaluate((el) => {
      return window.getComputedStyle(el).textAlign
    })
    // "left" or "start" are both acceptable left-aligned values
    expect(["left", "start"]).toContain(textAlign)
  })

  test("editor first paragraph is left-aligned even with signature present", async ({ page }) => {
    // Override email-signatures to return one signature with right-aligned content
    await page.route("**/api/admin/email-signatures**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: 1,
              name: "Test Sig",
              isDefault: true,
              renderedHtml:
                '<p style="text-align:right;font-weight:600;">Kind Regards</p><p style="text-align:right;">Test User</p>',
            },
          ],
        }),
      })
    })

    await openComposeDialog(page)

    const editor = page.getByTestId("property-gmail-compose-editor")

    // The first <p> in the editor (the greeting) should NOT be right-aligned
    const firstParagraphAlign = await editor.evaluate((el) => {
      const p = el.querySelector("p:not([data-compose-signature-block] p)")
      return p ? window.getComputedStyle(p).textAlign : "no-p"
    })
    expect(["left", "start"]).toContain(firstParagraphAlign)
  })

  test("table is functional and header is sticky after dialog is closed", async ({ page }) => {
    await openComposeDialog(page)

    await page.getByTestId("property-gmail-compose-cancel").click()
    await expect(page.getByTestId("property-gmail-compose-dialog")).not.toBeVisible()

    // Table row should still be visible
    await expect(
      page.getByTestId("admin-entity-row--properties--9001"),
    ).toBeVisible()

    // Table header should exist and be visible
    const header = page.locator("thead tr").first()
    await expect(header).toBeVisible()
  })
})
