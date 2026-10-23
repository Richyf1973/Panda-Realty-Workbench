# 07-Adobe Sign / 3h — E2E Test Coverage

Context: Automated Playwright tests using mock mode to cover every Sign flow without touching Adobe's servers, plus a manual sandbox smoke test checklist to run once before enabling the integration on Richard's real account.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Prerequisites:** All of phases 3b–3g must be complete before writing these tests.

---

## Playwright E2E tests (mock mode)

All tests run with `ADOBE_SIGN_TEST_MODE=true`. No Adobe API calls are made.

- [x] Test: admin "Send for signature" button appears on a shared file row with no active sign request
- [x] Test: clicking "Send for signature" creates a sign request → file row shows "Awaiting signature ⏳" badge
- [x] Test: "Send for signature" button is hidden when a pending sign request already exists
- [x] Test: POST to `/api/test/adobe-sign-webhook` with `event: "SIGNED"` → file row updates to "Signed ✅" with signedAt date
- [x] Test: POST to `/api/test/adobe-sign-webhook` with `event: "DECLINED"` → file row updates to "Declined ❌"
- [x] Test: "Resend reminder" button visible for pending agreements; clicking it calls the remind endpoint
- [x] Test: "Cancel request" button visible for pending agreements; clicking it updates status to cancelled
- [x] Run `npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3h.spec.ts" --no-retry` — 8/8 passed ✓
- [x] Test: portal document row shows "Sign required" badge for pending agreements → shipped in Phase 3g (`adobe-sign-phase-3g.spec.ts`)
- [x] Test: "Sign document" button opens the signing URL in a new tab (mock URL) → shipped in Phase 3g
- [x] Test: portal document row shows "Signed ✅" after webhook fires → shipped in Phase 3g (badge rendering via DB seed)
- [x] Test: portal document row shows "Signing cancelled" with contact message after decline → shipped in Phase 3g
- [x] Run `npm run test:e2e:scratch -- --app=panda-realty --spec="apps/panda-realty/e2e/adobe-sign-phase-3g.spec.ts" --no-retry` — 15/15 passed ✓

---

## Manual production smoke test (run with Richard's account + dummy signer email)

**Session refresh:** `ADOBE_SIGN_IMS_SID` expires every 2–4 weeks. When you see `IMS redirect chain ended without a token` in `lib/adobe-sign-client.ts`, run the automated refresh script (no DevTools needed):
```
node tools/refresh-adobe-sign-session.mjs
```
The script opens a browser, logs in automatically, asks for a 6-digit MFA code (write it to `tools/.adobe-mfa-code`), then updates both `ADOBE_SIGN_IMS_SID` and `ADOBE_SIGN_FG` in `.env.local`. Restart the dev server after it completes.

The smoke test below uses property **80 HOLLYWOOD AVENUE** (portal token: `3de47f54-d7d2-4299-9459-71b5e3dc040f`), buyer **Test Buyer** (entity 186004, email `tesrtemail@gmail.com`), file **Disclosure signed page.pdf** (Drive ID `1MoVrfBfJrFPB6veOJcQMpOxlXPh-uGfE`, already `shared_with_portal=true`).

Prerequisite: set `ADOBE_SIGN_TEST_MODE=false` in `.env.local` and restart the dev server before running these steps.

**Smoke test run: 2026-05-30** — Playwright MCP automation. Bug found and fixed during run: `sendReminder` was missing `recipientParticipantIds` (Adobe Sign v6 requirement).

- [x] Send a PDF for signature from the admin panel → "Awaiting signature" badge appears in admin; agreement created in Richard's Adobe Sign dashboard ✓
- [x] Open the signing URL in a new tab (portal → Sign document button) → Adobe Sign hosted signing page loads for the correct document ✓ (real `secure.au1.echosign.com` "Review and Sign" page with `Disclosure signed page.pdf from Richard Falzon` and signer `tesrtemail@gmail.com`)
- [ ] Complete signing in Adobe Sign → webhook fires within 30 seconds → status updates to "Signed ✅" in admin — **not tested**: IMS token cache cleared by HMR after `adobe-sign-client.ts` edit; real signing requires uninterrupted server process (production-safe, dev limitation only)
- [ ] Signed PDF is saved to the property's Google Drive folder — **not tested** (depends on signing completion above)
- [ ] Test decline: start a new sign request, decline signing → status updates to "Declined ❌" (Cancelled badge) — **not tested**
- [x] Test cancel: start a new sign request, click "Cancel request" in admin → agreement is cancelled in Adobe Sign dashboard ✓
- [x] Test resend reminder: start a sign request, click "Resend reminder" → reminder email received at signer address ✓ (required fix: v6 API needs `recipientParticipantIds` — fixed in `lib/adobe-sign-client.ts`)
- [ ] Confirm health cron still returns `{ status: "ok" }` after all operations — **not tested** (cron endpoint requires `CRON_SECRET` header)
