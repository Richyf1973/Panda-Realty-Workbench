# 07-Adobe Sign / 05 — Portal Client UI

Context: The client sees which documents require their signature and can initiate signing directly from the portal. Adobe Sign's signing experience opens either embedded or in a new tab.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

---

## Decisions

- **Signing flow:** Open Adobe Sign's hosted signing page in a new tab (simpler than embedding). Client signs in Adobe Sign, returns to portal, status updates on next poll.
- **Status display:** Document row in the portal shows a "Sign required" badge when `signatureStatus = 'pending'` and "Signed ✅" when completed.

---

## Tasks

- [x] Extend portal documents API response to include `signatureStatus` and `adobeSignAgreementId` for each file
- [x] In `PortalDocuments` component: render "Sign required" badge for files with `signatureStatus = 'pending'`
- [x] Add "Sign document" button for pending files — calls `GET /api/portal/[token]/sign-url/[fileId]` which returns the Adobe Sign signing URL for that client
- [x] Create `GET /api/portal/[token]/sign-url/[fileId]` route — validates token, retrieves signing URL from Adobe Sign `getSigningUrl()`, returns it (does not redirect, lets client JS open in new tab)
- [x] Render "Signed ✅" badge and `signedAt` date for completed agreements
- [x] Render "Signing cancelled" for declined agreements with a note to contact Richard
- [x] Run `npm run typecheck -w panda-realty` — exits 0
