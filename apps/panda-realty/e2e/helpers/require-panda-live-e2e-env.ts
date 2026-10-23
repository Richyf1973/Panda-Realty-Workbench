import { e2eAdminCredentials, e2ePandaAdminListApiConfigured } from "./admin-auth"

/** Throws if admin or DB env is missing — use instead of `test.skip` so misconfiguration fails loudly. */
export function requirePandaLiveE2eEnv(): void {
  if (!e2eAdminCredentials) {
    throw new Error(
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see apps/panda-realty/.env.example).",
    )
  }
  if (!e2ePandaAdminListApiConfigured) {
    throw new Error(
      "Set DATABASE_URL for Panda live E2E. Playwright globalSetup runs the sellers pipeline seed when DATABASE_URL is set.",
    )
  }
}
