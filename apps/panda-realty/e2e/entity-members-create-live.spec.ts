import { expect, test } from "@playwright/test"

import {
  e2eAdminCredentials,
  e2ePandaAdminListApiConfigured,
  signInAsAdmin,
} from "./helpers/admin-auth"

test.describe("Buyer members — create member (live API)", () => {
  test("POST /api/admin/entity-members succeeds with name, contact, address, scheduled viewing", async ({
    page,
  }) => {
    test.skip(!e2eAdminCredentials, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set")
    test.skip(!e2ePandaAdminListApiConfigured, "DATABASE_URL not set")

    await signInAsAdmin(page)
    await page.goto(
      "/admin/entities?limit=25&page=1&sortKey=entityName&sortDir=asc&entityCategoryId=1&listLayout=grid",
    )
    await page.waitForLoadState("networkidle")

    await page.getByTestId(/^admin-entity-row-edit--entities--/).first().click()
    await expect(page.getByTestId("panda-entities-dialog-form")).toBeVisible({
      timeout: 20_000,
    })

    const section = page.getByTestId("panda-entities-buyer-tabs")
    await expect(section).toBeVisible({ timeout: 20_000 })
    await section.evaluate((el) => el.scrollIntoView({ block: "center" }))

    const postResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin/entity-members") &&
        res.request().method() === "POST" &&
        !res.url().includes("calendar-sync"),
      { timeout: 45_000 },
    )

    await section.getByRole("button", { name: /add new/i }).click()
    const dialog = page.getByTestId("buyer-member-dialog")
    await expect(dialog).toBeVisible()

    const suffix = Date.now()
    await dialog.getByLabel(/name \*/i).fill(`E2E Member ${suffix}`)
    await dialog.getByLabel(/^phone$/i).fill("0400111222")
    await dialog.getByLabel(/^email$/i).fill(`e2e.member.${suffix}@example.com`)
    await dialog.getByLabel(/^address$/i).fill("1 Test Street")

    await dialog.getByTestId("buyer-member-dialog-scheduled-viewing-trigger").click()
    const cal = page.locator('[data-slot="calendar"]')
    await expect(cal).toBeVisible({ timeout: 5_000 })
    await cal.locator("button[data-day]").nth(12).click()

    await dialog.getByTestId("buyer-member-dialog-save").click()

    const res = await postResponse
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null

    if (!res.ok()) {
      const errText =
        body && typeof body.error === "string"
          ? `${body.error}${typeof body.detail === "string" ? ` — ${body.detail}` : ""}`
          : await res.text()
      throw new Error(`POST entity-members failed ${res.status()}: ${errText}`)
    }

    expect(res.status()).toBe(201)
    expect(body).toMatchObject({
      memberName: `E2E Member ${suffix}`,
    })

    await expect(dialog).toBeHidden({ timeout: 15_000 })
  })
})
