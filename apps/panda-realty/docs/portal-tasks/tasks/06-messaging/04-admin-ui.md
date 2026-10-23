# 06-Messaging / 04 — Admin UI

Context: Richard's view of the message thread — in the admin panel alongside the portal controls section. He can read and reply without leaving the app.

Parent: [06-messaging.md](../06-messaging.md)

---

## Tasks

- [ ] Add `PortalMessageThread` component to the portal controls section of the property-entity admin panel
- [ ] Fetch thread via `GET /api/admin/portal-messages/[portalTokenId]` on panel open
- [ ] Show unread client message count as a badge on the portal controls section tab/header
- [ ] Render client messages left-aligned, agent messages right-aligned (consistent with portal view)
- [ ] Build send form — textarea + send button; POST to `/api/admin/portal-messages/[portalTokenId]`
- [ ] Optimistically append sent message to thread
- [ ] Empty state: "No messages yet. Your client hasn't sent a message."
- [ ] Run `npm run typecheck -w panda-realty` — exits 0
