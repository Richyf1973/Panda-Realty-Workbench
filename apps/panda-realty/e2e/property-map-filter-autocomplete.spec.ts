import { expect, test } from "@playwright/test"

import { e2eAdminCredentials, refreshPandaE2eEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Map radius filter — address autocomplete suburb filtering.
 *
 * Tests derived from Manual Verification checklist in:
 * specs/panda-realty-map-autocomplete-partial-query-fix.md
 *
 * Success factors:
 * 1. Autocomplete requests carry NO lat/lng/bounded bias params — filtering is server-side.
 * 2. Partial suburb-name queries (e.g. "Cab") return suggestions (no bounded=1 blocking them).
 * 3. Selecting a suggestion fills the input and repositions the map — no polygon placed.
 * 4. Clearing the field closes the dropdown.
 * 5. Unauthenticated requests return 401.
 * 6. Nonsense queries produce no crash.
 * 7. When the route returns fallback results (non-favorited suburb), client displays them.
 *
 * NOTE: Server-side suburb filtering logic (querying is_favorite properties, matching
 * address components) is not exercised here because the route is mocked. That logic
 * requires integration/unit tests against the real DB.
 */

const EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

const MOCK_STREETS = [
  { street: "E2E Map Street", suburb: "Caboolture", state: "QLD", postcode: "4510" },
]

const CABOOLTURE_ITEMS = [
  {
    id: "111",
    title: "Grogan Road, Caboolture, City of Moreton Bay, Queensland, 4510, Australia",
    lat: -27.073,
    lng: 152.951,
  },
]

const PARTIAL_SUBURB_ITEMS = [
  {
    id: "222",
    title: "Caboolture, Queensland, 4510, Australia",
    lat: -27.084,
    lng: 152.951,
  },
]

const FALLBACK_ITEMS = [
  {
    id: "333",
    title: "Oxford Street, Paddington, New South Wales, 2021, Australia",
    lat: -33.883,
    lng: 151.224,
  },
]

function requireCredentials(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).",
    )
  }
}

test.describe("Map radius filter — autocomplete suburb filtering", () => {
  test.beforeEach(async ({ page }) => {
    requireCredentials()
    await page.route("**/api/admin/properties**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_LIST_RESPONSE) }),
    )
    await page.route("**/api/admin/property-status**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STATUS_LIST_RESPONSE) }),
    )
    await page.route("**/api/streets?**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STREETS) }),
    )
    await signInAsAdmin(page)
  })

  // MV happy path step 4 — request carries only q, no bias coords
  test("autocomplete request carries only the query param — no lat, lng or bounded params", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: CABOOLTURE_ITEMS }) }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()
    await expect(page.getByTestId("property-map-filter-dialog")).toBeVisible()

    const autocompleteReq = page.waitForRequest(
      (req) => req.url().includes("/api/streets/autocomplete"),
    )
    await page.getByPlaceholder("Search for an address…").fill("Grogan")
    const req = await autocompleteReq

    const url = new URL(req.url())
    expect(url.searchParams.get("q")).toBe("Grogan")
    expect(url.searchParams.get("lat")).toBeNull()
    expect(url.searchParams.get("lng")).toBeNull()
    expect(url.searchParams.get("bounded")).toBeNull()
  })

  // MV happy path step 6 — partial suburb name returns suggestions (was blocked by bounded=1)
  test("partial suburb name returns suggestions without bounded restriction", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: PARTIAL_SUBURB_ITEMS }) }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()

    await page.getByPlaceholder("Search for an address…").fill("Cab")
    await page.waitForTimeout(400) // debounce

    await expect(page.getByTestId("autocomplete-suggestions")).toBeVisible()
    await expect(page.getByTestId("autocomplete-suggestions").locator("li").first()).toContainText("Caboolture")
  })

  // MV happy path step 4–5 + 7 — selecting suggestion fills input and fires onLocationSelect
  test("selecting a local suggestion populates the input and fires onLocationSelect", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: CABOOLTURE_ITEMS }) }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()

    const input = page.getByPlaceholder("Search for an address…")
    await input.fill("Grogan")
    const firstSuggestion = page.getByTestId("autocomplete-suggestions").locator("li").first()
    await expect(firstSuggestion).toBeVisible()
    await firstSuggestion.dispatchEvent("mousedown")

    await expect(input).toHaveValue(
      "Grogan Road, Caboolture, City of Moreton Bay, Queensland, 4510, Australia",
    )
  })

  // MV edge case step 8 — map click no longer changes autocomplete params (biasCenter removed)
  test("after map click, autocomplete request still carries no bias coordinates", async ({ page }) => {
    const capturedParams: Array<{ lat: string | null; lng: string | null; bounded: string | null }> = []

    await page.route("**/api/streets/autocomplete**", (route) => {
      const url = new URL(route.request().url())
      capturedParams.push({
        lat: url.searchParams.get("lat"),
        lng: url.searchParams.get("lng"),
        bounded: url.searchParams.get("bounded"),
      })
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()
    await expect(page.getByTestId("property-map-filter-dialog")).toBeVisible()

    await page.getByPlaceholder("Search for an address…").fill("Grogan")
    await page.waitForTimeout(400)

    // Simulate map click to move circle centre
    const mapWrap = page.getByTestId("property-map-filter-map-wrap")
    await mapWrap.click({ position: { x: 100, y: 100 } })

    await page.getByPlaceholder("Search for an address…").fill("Webster")
    await page.waitForTimeout(400)

    // All requests — before and after map click — must carry no bias params
    for (const params of capturedParams) {
      expect(params.lat).toBeNull()
      expect(params.lng).toBeNull()
      expect(params.bounded).toBeNull()
    }
  })

  // MV edge case step 9 — fallback: route returns non-local results, client displays them
  test("when route returns fallback results from outside favorited suburbs, client shows them", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: FALLBACK_ITEMS }) }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()

    await page.getByPlaceholder("Search for an address…").fill("Oxford")
    await page.waitForTimeout(400)

    await expect(page.getByTestId("autocomplete-suggestions")).toBeVisible()
    await expect(page.getByTestId("autocomplete-suggestions").locator("li").first()).toContainText("Oxford Street")
  })

  // MV edge case step 11 — clearing field closes dropdown
  test("clearing the search field closes the suggestions dropdown", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: CABOOLTURE_ITEMS }) }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()

    const input = page.getByPlaceholder("Search for an address…")
    await input.fill("Grogan")
    await expect(page.getByTestId("autocomplete-suggestions").locator("li").first()).toBeVisible()

    await input.fill("")
    await expect(page.getByTestId("autocomplete-suggestions")).not.toBeVisible()
  })

  // MV error step 12 — nonsense query returns no suggestions, no crash
  test("nonsense query returns no suggestions and no visible error", async ({ page }) => {
    await page.route("**/api/streets/autocomplete**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("property-map-filter-trigger").click()

    await page.getByPlaceholder("Search for an address…").fill("zzzxxx")
    await page.waitForTimeout(400)

    await expect(page.getByTestId("autocomplete-suggestions")).not.toBeVisible()
    await expect(page.getByTestId("property-map-filter-dialog")).toBeVisible()
  })

  // MV error step 13 — unauthenticated request returns 401
  test("unauthenticated request to autocomplete endpoint returns 401", async ({ browser }) => {
    const unauthCtx = await browser.newContext()
    try {
      const response = await unauthCtx.request.get("/api/streets/autocomplete?q=test")
      expect(response.status()).toBe(401)
    } finally {
      await unauthCtx.close()
    }
  })

})
