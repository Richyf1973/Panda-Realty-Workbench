# 05 — Admin Controls

Context: Richard needs a panel in the existing admin app to manage each client's portal access — generate their private link, revoke it if the deal falls through, and see when they last visited.

Parent: [task-list.md](../task-list.md)

---

## Decisions

- **Location:** Add a "Portal" tab or section to the property-entity panel (the same place buyer details are managed today).
- **Generate link:** One click creates a `portalTokens` record and displays the URL. If a token already exists and is not revoked, show the existing URL — don't generate duplicates.
- **Copy to clipboard:** Button next to the URL for easy sharing.
- **Revoke:** Confirmation dialog before setting `revokedAt`. After revocation, UI shows "Access revoked on [date]" with an option to generate a new link.
- **Last opened:** Display `lastAccessedAt` from the token record — "Last visited: 3 days ago" or "Never opened" if null.

---

## Tasks

- [x] Add portal controls section to the property-entity admin panel (alongside existing buyer detail fields)
- [x] "Generate portal link" button — POST to admin token generation API; display resulting URL on success
- [x] Guard against duplicates: if active token exists, fetch and display it rather than generating a new one
- [x] "Copy link" button — copies portal URL to clipboard
- [x] Display `lastAccessedAt` as relative time ("Never opened" / "Last visited X ago")
- [x] "Revoke access" button — opens confirmation dialog, then PATCH to revocation API; update UI to show revoked state
- [x] "Generate new link" option shown after revocation (for re-inviting the same client)
- [x] Run `npm run typecheck -w panda-realty` — exits 0
