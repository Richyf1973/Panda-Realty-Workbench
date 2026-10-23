# 07-Adobe Sign / 3f — Status Tracking (Admin Panel)

Context: Surface signing state in the admin panel so Richard can see which documents are awaiting signature, which are signed, and which were declined — and take action (resend reminder, cancel) without leaving the app.

Parent: [07-adobe-sign.md](../07-adobe-sign.md)

**Prerequisites:** Phase 3d (agreement creation) and Phase 3e (webhook) must be complete first.

---

## Tasks

- [x] Add `getAgreementStatus(agreementId)` to `lib/adobe-sign-client.ts`
- [x] Add `sendReminder(agreementId)` to `lib/adobe-sign-client.ts`
- [x] Add `cancelAgreement(agreementId)` to `lib/adobe-sign-client.ts`
- [x] Create `GET /api/admin/portal-tokens/[portalTokenId]/sign-status` — for each pending sign request on this token, calls `getAgreementStatus()` and updates the DB if the status has drifted (fallback in case a webhook was missed)
- [x] Admin panel: show signing status badge per file row — "Awaiting signature" (amber), "Signed ✓" (green), "Cancelled" (red)
- [x] Admin panel: show `signedAt` date when status is signed
- [x] Admin panel: "Remind" button for pending agreements — calls `POST /api/admin/sign-requests/[requestId]/remind`
- [x] Admin panel: "Cancel" button for pending agreements — calls `DELETE /api/admin/sign-requests/[requestId]`, updates status to `cancelled`
- [x] Run `npm run typecheck -w panda-realty` — exits 0
