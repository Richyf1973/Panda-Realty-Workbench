# 07-Adobe Sign / 3b — Mock Mode + Sandbox

Context: Before building any real Sign flows, establish two safe testing layers: (1) a mock mode that lets Playwright E2E tests run without touching Adobe's servers, and (2) a manual smoke-test against Richard's real account using a dummy signer email to verify the full flow end-to-end before shipping.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Must be done before Phase 3d (agreement creation).**

---

## Mock mode (for automated tests)

- [x] Add `ADOBE_SIGN_TEST_MODE=true` env var to `.env.example` with a comment explaining it bypasses the real API
- [x] In `lib/adobe-sign-client.ts`, add a guard at the top of each exported function: when `ADOBE_SIGN_TEST_MODE` is set, return a realistic fake response instead of calling IMS or the Sign API
- [x] Mock responses to implement:
  - `getAccessToken()` → returns `"test-token-mock"`
  - `createAgreement(fileId, signerEmail)` → returns `{ agreementId: "TEST-AGR-" + fileId }`
  - `getAgreementStatus(agreementId)` → returns `{ status: "OUT_FOR_SIGNATURE" }`
  - `getSigningUrl(agreementId)` → returns `"/test/fake-signing-page"`
  - `sendReminder(agreementId)` → returns `{ result: "REMINDER_SENT" }`
  - `cancelAgreement(agreementId)` → returns `{ result: "AGREEMENT_CANCELLED" }`
  - `checkAdobeSignHealth()` → returns `{ healthy: true }`
- [x] Create `app/api/test/adobe-sign-webhook/route.ts` (only active when `ADOBE_SIGN_TEST_MODE=true`) — accepts `POST { agreementId, event: "SIGNED" | "DECLINED" }` and runs the same DB update logic as the real webhook, so Playwright tests can simulate signing completion
- [x] Set `ADOBE_SIGN_TEST_MODE=true` in `apps/panda-realty/.env.test` (or equivalent E2E env)
- [x] Run `npm run typecheck -w panda-realty` — exits 0

---

## Manual smoke-test (Richard's account, dummy signer email)

> **Decision (2026-05-29):** No separate sandbox account needed. Richard is fine with test agreements appearing in his dashboard — cancel them immediately after verifying. Use a dummy signer email (not a real client) so no one receives an unexpected signing request.

**Deferred to after Phase 3d** — requires `createAgreement` real implementation.

- [-] ~~Create a separate sandbox account~~ — skipped; using Richard's account directly
- [-] ~~Sandbox IMS credentials~~ — skipped; existing `ADOBE_SIGN_IMS_SID` is used
- [ ] When 3d is built: send a test PDF to a dummy signer email → agreement appears in Richard's Adobe Sign dashboard
- [ ] Sign the document in the signing page → webhook fires → status updates to "Signed ✅"
- [ ] Cancel the test agreement in Richard's dashboard immediately after verifying
- [ ] Repeat with a decline flow → status updates to "Declined ❌"
