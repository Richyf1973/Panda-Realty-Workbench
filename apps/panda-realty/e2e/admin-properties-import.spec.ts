import { expect, test } from "@playwright/test"
import * as XLSX from "xlsx"

import {
  e2eAdminCredentials,
  signInAsAdmin,
} from "./helpers/admin-auth"

/** One data row; header row matches worker `detectDataStartRow` (new format). */
function minimalPropertiesImportXlsxBuffer(): Buffer {
  const aoa: unknown[][] = [
    [],
    [],
    [
      "",
      "Street Address",
      "Suburb",
      "State",
      "Postcode",
      "",
      "Property Type",
      "Bed",
      "Bath",
      "Car",
    ],
    ["", "1 Main St", "Sydney", "NSW", "2000", "", "House", "3", "2", "2"],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
  return Buffer.from(XLSX.write(wb, { type: "array", bookType: "xlsx" }))
}

test.describe("Panda Realty admin — properties XLSX import", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !e2eAdminCredentials,
      "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set",
    )
    await signInAsAdmin(page)
  })

  test("import toolbar is visible on properties page", async ({ page }) => {
    // Mock the list API so the page renders regardless of DATABASE_URL
    await page.route("**/api/admin/properties?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          hasNextPage: false,
          hasPrevPage: false,
        }),
      }),
    )

    await page.goto("/admin/properties")
    const toolbarRegion = page.getByTestId("properties-import-toolbar-container")
    await expect(toolbarRegion).toBeVisible()
    await expect(
      toolbarRegion.getByTestId("properties-import-toolbar"),
    ).toBeVisible()
    await expect(
      toolbarRegion.getByTestId("properties-import-button--insert-only"),
    ).toBeVisible()
    await expect(
      toolbarRegion.getByTestId("properties-import-button--upsert"),
    ).toBeVisible()
    await expect(
      toolbarRegion.getByTestId("properties-sync-owner-addresses-button"),
    ).toBeVisible()
  })

  test("import sends insert_only mode when Import new only is used", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          hasNextPage: false,
          hasPrevPage: false,
        }),
      }),
    )

    let capturedMode: string | undefined
    await page.route("**/api/admin/properties/import", async (route) => {
      const body = route.request().postDataJSON() as { mode?: string }
      capturedMode = body.mode
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          inserted: 1,
          updated: 0,
          skippedExisting: 0,
          failed: 0,
          errors: [],
        }),
      })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("properties-import-button--insert-only").click()
    await page.getByTestId("properties-import-file-input").setInputFiles({
      name: "import.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: minimalPropertiesImportXlsxBuffer(),
    })

    await expect.poll(() => capturedMode).toBe("insert_only")
    await expect(
      page.getByText(/Import complete: 1 inserted/),
    ).toBeVisible()
  })

  test("import row payload includes streetAddress and ownerType from XLSX (owner addresses set server-side)", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          hasNextPage: false,
          hasPrevPage: false,
        }),
      }),
    )

    let capturedRow: Record<string, unknown> | undefined
    await page.route("**/api/admin/properties/import", async (route) => {
      const body = route.request().postDataJSON() as {
        rows?: Array<Record<string, unknown>>
      }
      capturedRow = body.rows?.[0]
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          inserted: 1,
          updated: 0,
          skippedExisting: 0,
          failed: 0,
          errors: [],
        }),
      })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("properties-import-button--insert-only").click()
    await page.getByTestId("properties-import-file-input").setInputFiles({
      name: "import.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: minimalPropertiesImportXlsxBuffer(),
    })

    await expect.poll(() => capturedRow).toBeDefined()
    expect(capturedRow!.streetAddress).toBe("1 Main St")
    expect(capturedRow!.ownerType).toBeNull()
    // Owner 1–3 addresses are derived from street on the server (not sent in the XLSX JSON row).
  })

  test("sync owner addresses POSTs to sync endpoint and refetches list", async ({
    page,
  }) => {
    let listCalls = 0
    await page.route("**/api/admin/properties?*", async (route) => {
      listCalls += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          hasNextPage: false,
          hasPrevPage: false,
        }),
      })
    })

    let syncCalled = false
    await page.route(
      "**/api/admin/properties/sync-owner-addresses",
      async (route) => {
        syncCalled = true
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ updated: 3, batches: 1 }),
        })
      },
    )

    await page.goto("/admin/properties")
    const initialListCalls = listCalls
    await page.getByTestId("properties-sync-owner-addresses-button").click()
    await expect.poll(() => syncCalled).toBe(true)
    await expect.poll(() => listCalls).toBeGreaterThan(initialListCalls)
  })

  test("import sends upsert mode when Import & update existing is used", async ({
    page,
  }) => {
    await page.route("**/api/admin/properties?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          hasNextPage: false,
          hasPrevPage: false,
        }),
      }),
    )

    let capturedMode: string | undefined
    await page.route("**/api/admin/properties/import", async (route) => {
      const body = route.request().postDataJSON() as { mode?: string }
      capturedMode = body.mode
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          inserted: 1,
          updated: 0,
          skippedExisting: 0,
          failed: 0,
          errors: [],
        }),
      })
    })

    await page.goto("/admin/properties")
    await page.getByTestId("properties-import-button--upsert").click()
    await page.getByTestId("properties-import-file-input").setInputFiles({
      name: "import.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: minimalPropertiesImportXlsxBuffer(),
    })

    await expect.poll(() => capturedMode).toBe("upsert")
    await expect(
      page.getByText(/Import complete: 1 rows processed/),
    ).toBeVisible()
  })

  test("import file input is available after choosing an import mode", async ({
    page,
  }) => {
    // Mock the list API
    await page.route("**/api/admin/properties?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 25,
          hasNextPage: false,
          hasPrevPage: false,
        }),
      }),
    )

    // Mock the import API
    await page.route("**/api/admin/properties/import", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          inserted: 2,
          updated: 0,
          failed: 0,
          errors: [],
        }),
      }),
    )

    await page.goto("/admin/properties")
    await page.getByTestId("properties-import-button--upsert").click()

    const fileInput = page.getByTestId("properties-import-file-input")
    await expect(fileInput).toBeAttached()
  })
})
