# 06-Messaging / 05 — Email Notifications

Context: When a client sends a message, Richard receives an email notification so he doesn't need to be in the app to know a message arrived. Reuses the existing mailer infrastructure (`sendAgentNotification` pattern from offer form submissions).

Parent: [06-messaging.md](../06-messaging.md)

---

## Tasks

- [ ] Create `sendPortalMessageNotification` function in `apps/panda-realty/lib/portal-notifications.ts` — accepts message body, client name, property address, and portal admin URL
- [ ] Email template: subject "New portal message from [client name] — [property address]"; body includes the message text and a link to the admin panel for that property-entity
- [ ] Call `sendPortalMessageNotification` inside the `POST /api/portal/[token]/messages` handler after inserting the message
- [ ] Do not send notification if Richard is the sender (`senderRole = 'agent'`)
- [ ] Run `npm run typecheck -w panda-realty` — exits 0
