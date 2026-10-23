# Customer Portal — Proposed Design for Richard to Review

**What this document is about:** Based on what's already in the app, I've drafted what the client portal would look like and what it would show. Nothing is built yet — I need you to review this and tell me what to change, add, or remove before I start.

---

## How the Portal Works (Recap)

Each client gets a unique private link — their personal portal URL. They bookmark it and open it whenever they want to check their deal. No login, no password.

When they open their link, the portal shows everything relevant to their deal with you — their property, the key dates and conditions, and the documents you've chosen to share with them.

---

## What the Portal Shows — Proposed Layout

Here is what I'm proposing the client sees when they open their portal link. This is based on data that already exists in the app — nothing needs to be invented from scratch.

---

### Section 1 — Property Summary (top of the page)

A clean header showing the property they are involved with:

```
┌─────────────────────────────────────────────────────┐
│  12 Example Street, Caboolture QLD 4510             │
│  3 bed · 2 bath · 1 car                             │
│                                                     │
│  Contract Date:    15 May 2026                      │
│  Settlement Date:  26 June 2026                     │
└─────────────────────────────────────────────────────┘
```

**Data source:** Already in the app — property address, bed/bath/car, contract date, settlement date.

> **Your input:** Is there anything else from the property you'd want a client to see here? Anything you'd prefer to leave out (e.g. sale price)?

---

### Section 2 — Conditions Timeline

A timeline of the key dates and deadlines for their deal, computed automatically from the contract date and the conditions recorded in their offer.

```
┌─────────────────────────────────────────────────────┐
│  CONDITIONS & KEY DATES                             │
│                                                     │
│  ✅  Contract Date          15 May 2026   (past)    │
│  ✅  Cooling Off            22 May 2026   (past)    │
│  ⏳  Finance Approval       5 Jun 2026    (11 days) │
│  ⏳  Building & Pest        8 Jun 2026    (14 days) │
│  ⏳  Settlement             26 Jun 2026   (32 days) │
└─────────────────────────────────────────────────────┘
```

- **Past dates** show as ticked (✅)
- **Upcoming dates** show with days remaining (⏳)
- The timeline updates automatically as dates pass — no manual work on your end

**Data source:** All of this already exists in the app — contract date, cooling off days, finance days, building & pest days, settlement date. The app already does this date calculation for the admin view. The portal reuses the same logic.

> **Your input:**
> - Are there any conditions you would *not* want clients to see on this timeline?
> - Should the timeline show only upcoming items, or past ones too?
> - Do conditions have a status you track (e.g. "Finance approved", "Waived")? If so, should that show here? Currently the app only tracks the deadline, not whether it was met.

---

### Section 3 — Documents

The files you have shared with the client, using the "Share with client" toggle we discussed.

```
┌─────────────────────────────────────────────────────┐
│  YOUR DOCUMENTS                                     │
│                                                     │
│  📄  Contract for Sale.pdf           View  Download │
│  📄  Building Inspection Report.pdf  View  Download │
│  📄  Settlement Instructions.pdf     View  Download │
└─────────────────────────────────────────────────────┘
```

- Only files you have toggled appear here — buyers and sellers have **separate toggles** per file ("Share with buyer" / "Share with seller")
- Client can view in the browser or download
- Files open through the portal — the underlying Google Drive link is never exposed

**Data source:** Existing entity and property files already in the app, filtered by the relevant toggle (`sharedWithBuyer` for buyer portal, `sharedWithSeller` for seller portal).

> **Your input:**
> - Should clients be able to upload documents back to you through the portal? Or is this read-only for them?
> - Do you want a "Date added" column so clients can see when a document was shared?

---

### Section 4 — Messages *(pending your answer to the messaging question)*

This section will be built once you confirm Option A (one-way) or Option B (two-way) from the [questions document](customer-portal-richard-questions.md).

---

## What Happens on Your End (Admin Side)

For each client, you would see a panel in the app (under their entity or property record) where you can:

- **Generate their portal link** — one click, creates their private URL
- **Revoke access** — deactivates the link if the deal falls through
- **Toggle file visibility** — choose which files they can see
- **See when they last visited** — a simple "last opened" timestamp so you know if they've checked in

---

## Summary of What's Decided vs Still Open

| Feature | Status |
|---------|--------|
| Private link access (no login) | ✅ Confirmed |
| Google Drive file storage | ✅ Confirmed |
| "Share with buyer" file toggle | ✅ Confirmed — separate from seller toggle |
| "Share with seller" file toggle | ✅ Confirmed — separate from buyer toggle |
| Property summary section | ✅ Ready to build — awaiting your review above |
| Conditions timeline | ✅ Ready to build — awaiting your review above |
| Documents section | ✅ Ready to build — awaiting your review above |
| Messaging | ✅ Confirmed — two-way conversation |
| Document signing | ✅ Confirmed — Adobe Sign integration (Richard already has an account) |
| Client upload capability | ⏳ Your call — see Documents section above |
| Show sale price to client | ✅ Confirmed — shown on both buyer and seller portals; source is accepted `buyerOffers.offer` |
| Condition status (met/waived) | ⏳ Your call — see Timeline section above |

---

*Prepared: 2026-05-26 | For: Richard (portal design review) | Related: [Portal Investigation](../../docs/richard-customer-portal-investigation.md) · [Questions for Richard](customer-portal-richard-questions.md) · [Storage Options](customer-portal-storage-options.md)*
