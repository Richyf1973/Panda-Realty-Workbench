# 06-Messaging / 02 — API Routes

Context: Two routes handle messaging — one public (portal client sends/reads) gated by the portal token, one admin (Richard sends/reads) gated by session auth.

Parent: [06-messaging.md](../06-messaging.md)

---

## Tasks

- [ ] Create `GET /api/portal/[token]/messages` — returns all messages for the token's thread, ordered by `sentAt ASC`; marks unread agent messages as read (`readAt = now()`) on fetch
- [ ] Create `POST /api/portal/[token]/messages` — inserts a new message with `senderRole = 'client'`; validates token is active (not revoked)
- [ ] Create `GET /api/admin/portal-messages/[portalTokenId]` — returns thread for admin view (session auth required)
- [ ] Create `POST /api/admin/portal-messages/[portalTokenId]` — inserts message with `senderRole = 'agent'`; marks unread client messages as read
- [ ] Run `npm run typecheck -w panda-realty` — exits 0
