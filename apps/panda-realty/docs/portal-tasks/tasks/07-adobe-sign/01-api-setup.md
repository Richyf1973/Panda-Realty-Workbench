# 07-Adobe Sign / 3a — Credentials, Client Wrapper, Health Monitoring

Context: Configure Adobe Sign API access for Panda Realty. Richard's account is on Creative Cloud Pro with Sign integrated into DC Web — the classic OAuth app admin is inaccessible, so authentication uses the IMS implicit flow with a long-lived session cookie instead of client_id/secret/refresh_token.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Status: Complete ✅**

---

## Completed tasks

- [x] Confirm API access is available on Richard's plan — verified 2026-05-29 via Playwright; base URL `https://api.au1.documents.adobe.com/api/rest/v6/` (AU1 data centre)
- [x] Obtain IMS session credentials via Playwright silent auth flow (`EchoSign2` client + `prompt=none`)
- [x] Add `ADOBE_SIGN_BASE_URL`, `ADOBE_SIGN_IMS_SID`, `ADOBE_SIGN_IMS_SESSION`, `ADOBE_SIGN_FG` to `.env.example` and `.env.local`
- [x] Distribute `.env.local` to all worktrees (galaxy, agent-1 through agent-4)
- [x] Create `apps/panda-realty/lib/adobe-sign-client.ts` — `getAccessToken()` (IMS silent flow, 55-min cache) + `checkAdobeSignHealth()` (hits `/users/me`)
- [x] Create `app/api/cron/adobe-sign-health/route.ts` — daily cron, emails Gmail alert if session broken
- [x] Create `components/admin/adobe-sign-health-banner.tsx` — async server component, amber warning bar when Sign is unavailable
- [x] Wire banner into `app/admin/layout.tsx` inside `<Suspense fallback={null}>`
- [x] Register cron in `vercel.json` (`0 8 * * *`)
- [x] `npm run typecheck -w panda-realty` — exits 0

---

## Auth architecture

IMS session-based silent auth:
1. `getAccessToken()` calls `GET ims-na1.adobelogin.com/ims/authorize/v2?client_id=EchoSign2&prompt=none&...`
2. Injects `ims_sid` cookie for any redirect hop to `*.services.adobe.com`
3. Extracts `access_token` from the final redirect URL hash
4. Caches token for 55 minutes (tokens expire after 1 hour)

**Session renewal:** When `ims_sid` expires, re-run `/playwright` against `acrobat.adobe.com`, log in, extract fresh cookies, update `ADOBE_SIGN_IMS_SID` in env.
