/**
 * Map filter bypasses Favourites + Status — live API test (no `page.route` mocks; hits real Postgres).
 *
 * Why: the properties list defaults the Favourites segment to ON, so before this fix a map-area
 * (`streetFilter`) search was silently narrowed to favourites-only and returned almost nothing.
 * The server now ignores both the Favourites toggle and the Status filter whenever `streetFilter`
 * is active (config: `listFiltersBypassedByAppendWhereHint` on the `properties` entity, honored in
 * `@repo/admin/admin-entity-list-page`). This test proves that end-to-end against the real query.
 *
 * Verifies:
 * 1. With a street filter active, Favourites-on (default) returns the SAME count as Favourites-all.
 * 2. A known NON-favourite property on that street appears under the default (favourites-on) query.
 * 3. A Status filter that matches nothing still returns the row when the street filter is active.
 *
 * Env (`apps/panda-realty/.env.local`): `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `DATABASE_URL`.
 * Run: npm run test:e2e:scratch -- --app=panda-realty --spec=apps/panda-realty/e2e/property-map-filter-bypass.live.spec.ts
 */

import { expect, test } from "@playwright/test"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Mirror `panda_street_key()` (migration 0041): strip the leading house/unit designator so the bare
 * street name matches the indexed key. Using the *identical* regex guarantees a match by construction
 * — the server normalizes the query side with `panda_street_norm` (lowercase/trim only), so
 * `norm(strip(addr))` on both sides aligns regardless of the address shape.
 */
function deriveStreetName(streetAddress: string): string {
  return streetAddress.replace(/^\s*(lot\s+)?(\S*[0-9]\S*)\s+/i, "").trim()
}

test.describe("Properties — map filter bypasses Favourites + Status (live)", () => {
  // Live test hits the real list query (with per-row enrichment) several times on a possibly cold/
  // slow dev server — give it more headroom than the 60s default. Every call below uses limit=1 so
  // only counts come back (no heavy 200-row enrichment).
  test.setTimeout(150_000)

  test("street filter ignores the favourites toggle (default on) and the Status filter", async ({
    page,
  }) => {
    requirePandaE2eAdminListLiveEnv()
    await signInAsAdmin(page)

    // totalCount only (limit=1) — cheap: the list route enriches each returned row, so fetching many
    // rows is expensive. We prove the bypass with counts, not by listing rows.
    const totalOf = async (qs: string): Promise<number> => {
      const res = await page.request.get(`/api/admin/properties?${qs}&limit=1`)
      expect(res.ok(), `GET failed: ${qs}`).toBeTruthy()
      return ((await res.json()) as { totalCount: number }).totalCount
    }

    // Find a real NON-favourite property to use as the ground-truth row. The list's default sort
    // surfaces seed fixtures first (e.g. "GREENTEST 2 — Under contract, a date has passed"), whose
    // label isn't a real address and may contain a comma (the streetFilter entry delimiter). So
    // scan a page of non-favourites and pick one whose address carries a leading house/unit
    // designator (real addresses always do — the seed labels don't) with no comma/tilde, then
    // confirm the derived street actually matches at least itself before asserting on it.
    const listRes = await page.request.get("/api/admin/properties?isFavorite=false&limit=50")
    expect(listRes.ok(), "non-favourite list GET should succeed").toBeTruthy()
    const items = ((await listRes.json()) as {
      items: Array<{ propertyListId: number; streetAddress: string; state: string; isFavorite: boolean }>
    }).items
    expect(items.length, "DB needs non-favourite properties").toBeGreaterThan(0)

    let chosen: { streetFilter: string; countFavAll: number } | undefined
    for (const it of items) {
      const addr = String(it.streetAddress ?? "")
      if (it.isFavorite || addr.includes(",") || addr.includes("~")) continue
      const bareStreet = deriveStreetName(addr)
      // A stripped designator (result differs from the input) marks a real address, not a label.
      if (bareStreet.length === 0 || bareStreet === addr.trim()) continue
      const state = (it.state ?? "QLD").trim() || "QLD"
      const streetFilter = encodeURIComponent(`${bareStreet}~${state}`)
      // countFavAll counts every property on this street — and includes this NON-favourite row,
      // so it is the ground-truth "favourites ignored" total for the assertions below.
      const countFavAll = await totalOf(`streetFilter=${streetFilter}&isFavorite=all`)
      if (countFavAll > 0) {
        chosen = { streetFilter, countFavAll }
        break
      }
    }
    expect(
      chosen,
      "could not find a real non-favourite property whose street matches the indexed key",
    ).toBeTruthy()
    const { streetFilter, countFavAll } = chosen!

    // 1. Favourites bypass: with the street filter active, the favourites segment has no effect.
    //    Omitting it makes the server default to favourites-ON; the count must still equal
    //    favourites-all. Since countFavAll includes the chosen NON-favourite row, equality proves
    //    that non-favourite is returned under the default favourites-on query (toggle bypassed).
    const countFavDefault = await totalOf(`streetFilter=${streetFilter}`)
    expect(
      countFavDefault,
      "favourites-on (default) must match favourites-all when a street filter is active",
    ).toBe(countFavAll)

    // 2. Status bypass: a status id no property has would zero the list without the bypass; with the
    //    street filter active the Status filter is ignored, so the count is unchanged.
    const STATUS_ID_MATCHING_NOTHING = 99999999
    const countWithDeadStatus = await totalOf(
      `streetFilter=${streetFilter}&propertyStatusId=${STATUS_ID_MATCHING_NOTHING}`,
    )
    expect(
      countWithDeadStatus,
      "an unmatchable Status filter must not narrow results when a street filter is active",
    ).toBe(countFavAll)
  })
})
