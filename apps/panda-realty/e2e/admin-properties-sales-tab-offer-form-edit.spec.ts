import { expect, test, type Route } from "@playwright/test"

import { e2eAdminCredentials, signInAsAdmin } from "./helpers/admin-auth"
import {
  OFFER_ACCEPTED,
  OFFER_EDITABLE,
  OFFER_SECOND,
  PREFILL_8001,
  PREFILL_8003,
  openSalesTab,
  routeAdminFormView,
  routePrefillForOffer,
} from "./helpers/admin-offer-form-edit-fixtures"
import {
  EMPTY_PROPERTY_ENTITIES_RESPONSE,
  PROPERTY_EDIT_WITH_BUYER,
  SINGLE_PROPERTY_RESPONSE,
  STATUS_LIST_RESPONSE,
} from "./helpers/admin-properties-mocks"

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Sales tab — buyer offer form editable (mocked)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    await page.route("**/api/admin/property-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) })
    })
    await page.route("**/api/admin/buyer-status**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })
    await signInAsAdmin(page)
  })

  // ── Happy path: per-row "View Form" — form is immediately editable ─────────

  test("form fields are editable (not disabled) when View Form ↘ is clicked", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await openSalesTab(page, [OFFER_EDITABLE])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    // Property address is read-only
    const addressField = section.getByTestId("buyer-offer-native--property-address")
    await expect(addressField).toBeVisible()
    const addressTag = await addressField.evaluate((el) => el.tagName.toLowerCase())
    expect(addressTag).not.toBe("input")

    // Buyer 1 name IS editable
    const buyer1Name = section.getByTestId("buyer-offer-native--buyer-1-name")
    await expect(buyer1Name).toBeEnabled()
    await expect(buyer1Name).not.toBeDisabled()
  })

  test("Save and Cancel buttons are visible inside the expanded form", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await openSalesTab(page, [OFFER_EDITABLE])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await expect(section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible()
    await expect(section.getByTestId(`buyer-offer-native-view-cancel--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible()
  })

  test("Save sends PATCH /api/admin/buyer-offers/{id}/form-data with updated values", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)

    let patchBody: Record<string, unknown> | null = null
    await page.route(`**/api/admin/buyer-offers/${OFFER_EDITABLE.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = await route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_EDITABLE])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    const nameInput = section.getByTestId("buyer-offer-native--buyer-1-name")
    await nameInput.fill("Alice Smith EDITED")

    const offerInput = section.getByTestId("buyer-offer-native--offer-amount")
    await offerInput.fill("1300000")

    await section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`).click()

    await expect(async () => {
      expect(patchBody).not.toBeNull()
    }).toPass({ timeout: 5_000 })

    expect(patchBody!.offerAmount).toBe("1300000")
    expect(patchBody!.buyers).toBeDefined()
  })

  test("after Save, the offer row in the Latest Buyer Offers table updates (re-fetches)", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)

    let buyerOffersCallCount = 0
    await page.route(`**/api/admin/buyer-offers/${OFFER_EDITABLE.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    await page.route("**/api/admin/properties**", async (route: Route) => {
      const url = route.request().url()
      if (url.includes("/buyer-offers") && route.request().method() === "GET") {
        buyerOffersCallCount++
        const updatedOffer = buyerOffersCallCount > 1
          ? [{ ...OFFER_EDITABLE, offer: "1300000" }]
          : [OFFER_EDITABLE]
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(updatedOffer) })
        return
      }
      if (url.match(/\/api\/admin\/properties\/1001(\?|$)/)) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...SINGLE_PROPERTY_RESPONSE, items: [{ ...PROPERTY_EDIT_WITH_BUYER }] }),
      })
    })
    await page.route("**/api/admin/property-entities**", async (route: Route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_PROPERTY_ENTITIES_RESPONSE) })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    await expect(page.getByTestId("panda-properties-form-tab--sales")).toBeVisible()

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId("buyer-offer-native--buyer-1-name").fill("Alice Smith EDITED")
    await expect(section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`)).toBeEnabled({ timeout: 5_000 })
    await section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`).click()

    await expect(async () => {
      expect(buyerOffersCallCount).toBeGreaterThan(1)
    }).toPass({ timeout: 5_000 })
  })

  test("Cancel button reverts form fields to original fetched values", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await openSalesTab(page, [OFFER_EDITABLE])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    const nameInput = section.getByTestId("buyer-offer-native--buyer-1-name")
    await expect(nameInput).toHaveValue("Alice Smith")

    await nameInput.fill("TEMP CHANGE")
    await expect(nameInput).toHaveValue("TEMP CHANGE")

    await section.getByTestId(`buyer-offer-native-view-cancel--${OFFER_EDITABLE.buyerOfferId}`).click()

    await expect(nameInput).toHaveValue("Alice Smith")
  })

  // ── Happy path: accepted offer view below the table ────────────────────────

  test("accepted offer form below the table is also immediately editable", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await routeAdminFormView(page, OFFER_ACCEPTED.buyerOfferId, PREFILL_8001)
    await openSalesTab(page, [OFFER_ACCEPTED])

    const salesTab = page.getByTestId("panda-properties-form-tab--sales")
    const nativeView = salesTab.getByTestId(`buyer-offer-native-view--${OFFER_ACCEPTED.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 8_000 })

    const nameInput = nativeView.getByTestId("buyer-offer-native--buyer-1-name")
    await expect(nameInput).toBeEnabled()
    await expect(nameInput).not.toBeDisabled()

    await expect(nativeView.getByTestId(`buyer-offer-native-view-save--${OFFER_ACCEPTED.buyerOfferId}`)).toBeVisible()
    await expect(nativeView.getByTestId(`buyer-offer-native-view-cancel--${OFFER_ACCEPTED.buyerOfferId}`)).toBeVisible()
  })

  test("accepted offer form saves via PATCH /api/admin/buyer-offers/{id}/form-data", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await routeAdminFormView(page, OFFER_ACCEPTED.buyerOfferId, PREFILL_8001)

    let patchCalled = false
    await page.route(`**/api/admin/buyer-offers/${OFFER_ACCEPTED.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_ACCEPTED])

    const salesTab = page.getByTestId("panda-properties-form-tab--sales")
    const nativeView = salesTab.getByTestId(`buyer-offer-native-view--${OFFER_ACCEPTED.buyerOfferId}`)
    await expect(nativeView).toBeVisible({ timeout: 8_000 })

    await nativeView.getByTestId("buyer-offer-native--buyer-1-phone").fill("0400 999 888")
    await nativeView.getByTestId(`buyer-offer-native-view-save--${OFFER_ACCEPTED.buyerOfferId}`).click()

    await expect(async () => { expect(patchCalled).toBe(true) }).toPass({ timeout: 5_000 })
  })

  // ── Happy path: main dialog "Save changes" auto-saves offer form edits ─────

  test("main dialog Save changes auto-saves pending offer form edits before saving property", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)

    let offerPatchCalled = false
    await page.route(`**/api/admin/buyer-offers/${OFFER_EDITABLE.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        offerPatchCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    await page.route("**/api/admin/properties/1001", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_EDITABLE])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId("buyer-offer-native--extra-comments").fill("Auto-save test note")

    await page.getByRole("button", { name: /save changes/i }).click()

    await expect(async () => { expect(offerPatchCalled).toBe(true) }).toPass({ timeout: 8_000 })
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  test("accordion: expanding a second offer collapses the first", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await routePrefillForOffer(page, "edit-token-xyz", PREFILL_8003)
    await openSalesTab(page, [OFFER_EDITABLE, OFFER_SECOND])

    const section = page.getByTestId("panda-properties-form-section--buyer-offers")

    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_SECOND.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_SECOND.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).not.toBeVisible()
  })

  test("main dialog Save changes does NOT call offer PATCH when no form is expanded", async ({ page }) => {
    let offerPatchCalled = false
    await page.route(`**/api/admin/buyer-offers/*/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        offerPatchCalled = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })
    await page.route("**/api/admin/properties/1001", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROPERTY_EDIT_WITH_BUYER) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_EDITABLE])

    await page.getByRole("button", { name: /save changes/i }).click()

    await page.waitForTimeout(1_000)
    expect(offerPatchCalled).toBe(false)
  })

  // ── Error / rejection states ──────────────────────────────────────────────

  test("error from PATCH /form-data is displayed inline and form edits are preserved", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)
    await page.route(`**/api/admin/buyer-offers/${OFFER_EDITABLE.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_EDITABLE])
    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId("buyer-offer-native--buyer-1-name").fill("Edited Name")
    await section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`).click()

    await expect(section.getByTestId(`buyer-offer-native-view-save-error--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 5_000 })

    await expect(section.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Edited Name")
  })

  // ── Solicitor fields (Section 2) ──────────────────────────────────────────

  test("solicitor fields are editable and included in PATCH body", async ({ page }) => {
    await routePrefillForOffer(page, "edit-token-abc", PREFILL_8001)

    let patchBody: Record<string, unknown> | null = null
    await page.route(`**/api/admin/buyer-offers/${OFFER_EDITABLE.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = await route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_EDITABLE])
    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId("buyer-offer-native--solicitor-name").fill("New Solicitor")
    await section.getByTestId("buyer-offer-native--solicitor-email").fill("new@law.com")
    await section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`).click()

    await expect(async () => { expect(patchBody).not.toBeNull() }).toPass({ timeout: 5_000 })
    expect(patchBody!.solicitorName).toBe("New Solicitor")
    expect(patchBody!.solicitorEmail).toBe("new@law.com")
  })

  // ── Persistence check (reload simulated by re-opening dialog) ─────────────

  test("saved values appear when dialog is closed and re-opened", async ({ page }) => {
    let patchDone = false
    const updatedPrefill = { ...PREFILL_8001, buyers: [{ ...((PREFILL_8001.buyers as unknown[])[0] as Record<string, unknown>), name: "Alice Smith SAVED" }] }

    await page.route(`**/api/offer-form/edit-token-abc**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(patchDone ? updatedPrefill : PREFILL_8001) })
    })
    await page.route(`**/api/admin/buyer-offers/${OFFER_EDITABLE.buyerOfferId}/form-data`, async (route) => {
      if (route.request().method() === "PATCH") {
        patchDone = true
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
        return
      }
      await route.fallback()
    })

    await openSalesTab(page, [OFFER_EDITABLE])
    const section = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await section.getByTestId("buyer-offer-native--buyer-1-name").fill("Alice Smith SAVED")
    await expect(section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`)).toBeEnabled({ timeout: 5_000 })
    await section.getByTestId(`buyer-offer-native-view-save--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(async () => { expect(patchDone).toBe(true) }).toPass({ timeout: 5_000 })

    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByTestId("admin-entity-crud-dialog--properties")).not.toBeVisible()

    await page.getByTestId("admin-entity-row--properties--1001").click()
    await page.getByTestId("panda-properties-form-tab-trigger--sales").click()
    const section2 = page.getByTestId("panda-properties-form-section--buyer-offers")
    await section2.getByTestId(`buyer-offer-section-view-form-btn--${OFFER_EDITABLE.buyerOfferId}`).click()
    await expect(section2.getByTestId(`buyer-offer-native-view--${OFFER_EDITABLE.buyerOfferId}`)).toBeVisible({ timeout: 8_000 })

    await expect(section2.getByTestId("buyer-offer-native--buyer-1-name")).toHaveValue("Alice Smith SAVED")
  })
})
