import type { Page } from "@playwright/test"

import { loadPandaRealtyE2eEnv } from "../load-panda-e2e-env"

export let e2eAdminCredentials = false
/** Live admin list **`GET /api/admin/*`** needs **`DATABASE_URL`** (same pattern as Vibram purchase). */
export let e2ePandaAdminListApiConfigured = false

function syncPandaE2eEnvBindings(): void {
  loadPandaRealtyE2eEnv()
  e2eAdminCredentials =
    Boolean(process.env.E2E_ADMIN_EMAIL?.trim()) && Boolean(process.env.E2E_ADMIN_PASSWORD?.trim())
  e2ePandaAdminListApiConfigured = Boolean(process.env.DATABASE_URL?.trim())
}

syncPandaE2eEnvBindings()

/** Call before `test.skip(...)` checks when env must be re-read from disk (e.g. cwd differs). */
export function refreshPandaE2eEnv(): void {
  syncPandaE2eEnvBindings()
}

/**
 * Throws if `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are missing or blank.
 * Prefer this over `test.skip` for signed-in specs so misconfiguration fails loudly.
 */
export function requirePandaE2eAdminCredentials(): void {
  refreshPandaE2eEnv()
  if (!e2eAdminCredentials) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).",
    )
  }
}

/**
 * Live admin list/detail `GET /api/admin/*` (throws if `DATABASE_URL` missing — prefer over
 * `test.skip` when the spec must hit real Postgres).
 */
export function requirePandaE2eAdminListLiveEnv(): void {
  requirePandaE2eAdminCredentials()
  if (!e2ePandaAdminListApiConfigured) {
    throw new Error(
      "DATABASE_URL not set — admin list uses live APIs (see apps/panda-realty/.env.example).",
    )
  }
}

export async function signInAsAdmin(page: Page) {
  syncPandaE2eEnvBindings()

  // When storageState is configured (globalSetup pre-loads the session cookie), goto("/login")
  // redirects instantly to /admin — the server sees the valid cookie and bounces immediately.
  // domcontentloaded is faster than the default "load" and sufficient here.
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60_000 })

  // If the session cookie is still valid the server redirects away from /login immediately.
  // In that case the login form never appears, so return early.
  if (!page.url().includes("/login")) return

  // Wait for React hydration before filling the form. Without this, clicking submit
  // before React attaches the onSubmit handler triggers a native GET form submission
  // and credentials appear in the URL as query params.
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="login-email-input"]')
      return el !== null && Object.keys(el).some((k) => k.startsWith("__reactProps") || k.startsWith("__reactFiber"))
    },
    { timeout: 30_000 },
  )
  await page.getByTestId("login-email-input").fill(process.env.E2E_ADMIN_EMAIL!)
  await page
    .getByTestId("login-password-input")
    .fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByTestId("login-submit").click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  })
}
