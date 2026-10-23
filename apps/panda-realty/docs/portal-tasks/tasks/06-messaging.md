# 06 — Two-Way Messaging

Context: Both Richard and the client can send messages inside the portal. Richard gets an email notification when a client replies. No messaging infrastructure currently exists in the app — this is a full new build.

Parent: [task-list.md](../task-list.md)

**Status: Done** — DB, API routes, client UI, admin UI (Messages tab), email notification, 20 E2E tests passing, improvements applied, cleanup complete. _spec: [panda-realty-portal-messaging.md](../../../../specs/panda-realty-portal-messaging.md)_

---

## Decision needed before starting

| Option | How it works | Effort | Experience |
|--------|-------------|--------|------------|
| **Polling** | Portal checks for new messages every 30s | Lower | Slight delay (acceptable for property deals) |
| **Supabase Realtime** | Messages appear instantly via websocket subscription | Higher | Instant |

Recommendation: **Polling** for V1 — adequate for low-frequency deal communication, faster to build, no new infrastructure dependency.

---

## Sub-areas (each complex enough for their own file)

- [x] Database schema → [sub-tasks](./06-messaging/01-schema.md)
- [x] API routes (send + list messages) → [sub-tasks](./06-messaging/02-api.md)
- [x] Portal client UI (thread view + send form) → [sub-tasks](./06-messaging/03-portal-ui.md)
- [x] Admin UI (thread view + send form in admin panel) → [sub-tasks](./06-messaging/04-admin-ui.md)
- [x] Email notification to Richard on new client message → [sub-tasks](./06-messaging/05-notifications.md)
