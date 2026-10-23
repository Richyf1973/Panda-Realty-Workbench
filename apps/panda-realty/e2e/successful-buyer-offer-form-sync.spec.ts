import { expect, test, type Page } from "@playwright/test"

import { requirePandaE2eAdminListLiveEnv, signInAsAdmin } from "./helpers/admin-auth"

/**
 * Forward-sync: editing a SUCCESSFUL BUYER member field (Name/Address/Phone/Email) pushes the value
 * into the latest offer-form submission, so the read-only "OFFER FORM SUBMISSION" panel stays
 * consistent with the editable rows. Previously the two were independent stores (entity_members vs
 * offer_form_submissions) and would drift — the Successful Buyer email could differ from the
 * submitted Buyer 1 email with no way to reconcile.
 *
 * Live test — single-member accepted buyer JOHN EDWARD COLLINS:
 *   property 202739, property_entity 185951, entity_member 2995.
 *
 * Run:
 *   npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/successful-buyer-offer-form-sync.spec.ts" --no-bail
 */

function envOrDefault(name: string, fallback: string): string {
  const v = process.env[name]?.trim()
  return v && v.length > 0 ? v : fallback
}

const PROPERTY_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_SINGLE_PROPERTY_ID", "202739")
const PROPERTY_ENTITY_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_SINGLE_PROPERTY_ENTITY_ID", "185951")
const MEMBER_ID = envOrDefault("E2E_PANDA_SUCCESSFUL_BUYER_SINGLE_MEMBER_ID", "2995")
const CANONICAL_EMAIL = "JOHN@COLLINSFIN.COM.AU"

const TID = "panda-properties-form-successful-buyer"

async function openDialog(page: Page) {
  await page.goto(`/admin/properties?openEdit=${PROPERTY_ID}`)
  await expect(page.getByTestId("admin-entity-crud-dialog--properties")).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId("panda-properties-form-section--successful-buyer")).toBeVisible({ timeout: 30_000 })
}

function submissionPanel(page: Page) {
  return page.getByTestId(`buyer-offer-form-submission-panel--${PROPERTY_ENTITY_ID}`)
}

/**
 * The Offer Form Submission panel lazy-loads: on (re)open, `acceptedOffer` starts null, the Tabs
 * remount once it loads, then the panel fetches `offer-form-status`. Wait for it to finish loading
 * (skeleton → panel) before asserting on its text.
 */
async function waitForSubmissionPanel(page: Page) {
  await expect(submissionPanel(page)).toBeVisible({ timeout: 30_000 })
}

async function setSuccessfulBuyerEmail(page: Page, value: string) {
  const input = page.getByTestId(`${TID}-member-email--${MEMBER_ID}`)
  // Wait for the RESPONSE (not just the request) so the server has committed the entity_members +
  // offer_form_submissions write before we reopen the dialog and re-fetch.
  const patch = page.waitForResponse(
    (res) =>
      res.request().method() === "PATCH" &&
      res.url().includes(`/api/admin/properties/${PROPERTY_ID}/successful-buyer-member/${MEMBER_ID}`),
    { timeout: 15_000 },
  )
  await input.fill(value)
  await input.blur()
  const res = await patch
  expect(res.status()).toBe(200)
}

test.beforeEach(() => {
  requirePandaE2eAdminListLiveEnv()
})

test("editing the Successful Buyer email syncs into the offer-form submission panel", async ({ page }) => {
  test.setTimeout(120_000)
  await signInAsAdmin(page)

  // Baseline: both the editable input and the read-only submission panel show the canonical email.
  await openDialog(page)
  await expect(page.getByTestId(`${TID}-member-email--${MEMBER_ID}`)).toHaveValue(CANONICAL_EMAIL)
  await waitForSubmissionPanel(page)
  await expect(submissionPanel(page)).toContainText(CANONICAL_EMAIL, { timeout: 15_000 })

  // Edit the Successful Buyer email — this PATCHes entity_members AND the latest submission.
  const probe = "synctest@example.com"
  await setSuccessfulBuyerEmail(page, probe)

  // Reopen the dialog so the submission panel re-fetches; Buyer 1 email now reflects the edit.
  await openDialog(page)
  await waitForSubmissionPanel(page)
  await expect(submissionPanel(page)).toContainText(probe, { timeout: 15_000 })
  await expect(submissionPanel(page)).not.toContainText(CANONICAL_EMAIL)

  // Restore the canonical value (keeps the shared demo property clean) and confirm it re-syncs.
  await setSuccessfulBuyerEmail(page, CANONICAL_EMAIL)
  await openDialog(page)
  await waitForSubmissionPanel(page)
  await expect(submissionPanel(page)).toContainText(CANONICAL_EMAIL, { timeout: 15_000 })
})
