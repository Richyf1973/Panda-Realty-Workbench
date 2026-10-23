# Panda Realty — Work Log (May 18 – May 31, 2026)

## Summary

| Period | Days Active | Est. Hours |
|--------|-------------|------------|
| May 18–20 | 3 | ~24.5 h |
| May 21–23 | 3 | ~24.5 h |
| May 24–26 | 3 | ~23.5 h |
| May 27–31 | 5 | ~43 h |
| **Total** | **14** | **~115.5 h** |

---

## Day-by-day breakdown

### May 18 — ~5.5 h

**Midday (~4.9 h):**
- Google Contacts sync count fixes (correct counts for "today"; endpoint corrected)
- Contact thread scrolling and reply-button accessibility fixed
- Gmail thread panel now aggregates all of an entity's member email addresses
- Property contact threads filtered and tagged by property

**Evening (~0.75 h):**
- Aggregated correspondence inbox added to the contact dialog

---

### May 19 — ~10.5 h

**Early morning (~2 h):**
- **Public buyer offer form** introduced — a shareable link with a public submission portal, redesigned with brand styling

**Morning (~5.4 h):**
- Cash-buyer conditional sections and settlement date picker on the public offer form
- Buyer phone synced to Google Contacts
- Fixed offer-form email links being relative/broken in certain environments

**Evening (~3.5 h):**
- Form 6: 10-tab fill modal with full PDF form pre-fill
- Offer form rebuilt to the 2026 pro-forma design
- Settlement block conditionally hidden; Form 6 auto-fills from property and owner data

---

### May 20 — ~8.5 h

**Early morning (~1.5 h):**
- Form 6 fill-modal UI/UX fixes; "Save as Template" added

**Midday (~3.5 h):**
- Form 6 auto-fills additional parts from owner and agent data
- Phone-number data consolidated to a single contact field across the app
- **Contract for Sale & Purchase auto-fill form** introduced (5-tab UI) with PDF field calibration tooling

**Evening (~3.5 h):**
- Contract S&P PDF field coordinates calibrated so text sits correctly on the form lines
- Accept button added for existing buyer offers
- Building & pest section restructured; email thread filtering switched to a date-based approach

---

### May 21 — ~11 h

**Early morning (~1 h):**
- Contract S&P auto-fill extended to pages 3–6 (8-tab UI); calibration tools and skill documented

**Midday — Offer Form v2 build (~9.5 h):**
- Wrote the design spec and implementation plan for Offer Form v2
- Database and data-model groundwork for v2 offer fields (including draft support)
- Offer form polish: header styling, finance-section labels, bank-contact table, signature defaults, print button
- Third-party representative section; reordered terms questions; section titles and payment hints
- Auto-save drafts every 5 minutes; pre-fill all offer and condition fields
- Pre-fill rewritten to pull from members, prior offers, and the latest submission
- Submission now writes member, solicitor, and all new offer fields (with draft mode)
- PDF preview endpoint for the offer form's Print button
- New v2 offer fields surfaced in the admin offer-conditions panel and pipeline badges
- Unit tests for the v2 upsert logic

**Evening (~0.75 h):**
- Settlement section always visible, with two-way sync and weekend-date blocking

---

### May 22 — ~9 h

**Early morning (~2 h):**
- Form 6 address fields and search criteria reworked (one tab removed)
- "Form Submitted" badge shown inline next to the status badge

**Midday (~6.25 h):**
- Offer form synced with Richard's template; dark mode removed; price-range field removed from the appointment price section
- Cooling-off field locked to 0 when waived; "not waived" label hidden
- "View offer" button with pre-fill and offer selection on the send link
- Five new owner-client fields added to properties and Form 6 with two-way sync
- Buyer offer list cleaned up (cooling-off and bank sub-details removed); deadline dates shown

**Evening (~0.75 h):**
- Began replacing the old offer-conditions panel with the embedded web offer form

---

### May 23 — ~4.5 h

**Early morning (~3.75 h):**
- Old offer-conditions panel replaced with a native admin offer view using proper form controls (read-only / editable variants)
- Test command and CI tooling updated

**Morning (~0.75 h):**
- Dialog scroll restored for custom forms with related sub-grids

---

### May 24 — ~6.5 h

**Afternoon (~3.85 h):**
- View and "View Form" buttons added to Sales-tab buyer offer rows
- Shared end-to-end testing utilities introduced, plus test-writing tooling and a scratch test runner
- Story/walkthrough generation infrastructure added

**Evening (~2.75 h):**
- Offer form aligned to the agreed HTML blueprint — multi-offer section, sale-status split, visual redesign
- Section labels (§1–§6) updated; multi-offer checkboxes and a 4-option sale-status dropdown added

---

### May 25 — ~5 h

**Midday (~3.5 h):**
- Contract S&P PDF coordinates recalibrated, with calibration tooling and extra fields
- "Create Drive Folder" button added to the property Files tab

**Evening (~1.5 h):**
- Checkbox coordinates recalibrated; area field added; configurable checkmark size
- Contract S&P coordinates recalibrated across all pages

---

### May 26 — ~12 h

**Midnight carry-over (~0.75 h):**
- Contract S&P fill step restructured into 6 tabs mirroring the PDF pages, with a test suite

**Morning (~4.75 h):**
- Test-spec cleanup; PDF guidance captions added to the Contract S&P form
- Contact member email threads shown in the main contact inbox
- Suburb/state/postcode auto-filled from the seller address
- Fixed the agents list showing zero rows
- Skeleton loaders shown while property detail tabs load

**Afternoon/evening (~6.5 h):**
- Global Notes tab added to the Edit Property dialog, with an Add Note button
- REIQ Contract S&P pre-fill mapping fixed and verified
- Buyer offer ordering fixes (accepted offer shown first)
- Context-aware button labels in the Forms panel ("View in Drive" / "Fill Form")
- **Seller portal foundation:** secure token system with admin and public routes, property summary section, condition timeline section, and a Documents section with a share-with-client toggle
- Form 6 pre-fill corrections (description, commission text sizing, address/suburb handling, legal-advice banner removed)
- Send history: edit, resend, and save-to-Drive refresh

---

### May 27 — ~10 h

**Morning (~6 h):**
- Documents-tab share toggle tooltip; Form 6 seller-address tidy-up
- Fixed an invisible toggle switch in dark mode
- Form 6 price linked to the property's appraised amount; title reference left blank as required
- **Seller portal:** admin controls tab added to the buyer workspace; all owners shown in the Form 6 acknowledgement

**Afternoon/evening (~6.5 h):**
- **Seller portal two-way messaging** (live polling), foundation Phase 1 and content Phase 2 sections, and a dual-tab admin messaging panel
- Expand/collapse toggle for property notes
- Dynamic property addresses in the simultaneous-settlement label
- Inline editable offer form replaced with a read-only submission panel
- Seller-portal decisions documented

---

### May 28 — ~10 h

**Morning (~1.85 h):**
- Seller portal Phase 4 — contract milestone tracking

**Midday/afternoon/evening (~8 h):**
- Offer view fixes (radio labels) and a "Recommend Inspectors" section added to the submission panel
- **Portal walkthrough generator** — a self-contained HTML guide for the client (Richard), refined for loading, navigation, and richer content
- Offer form layout reworked: editable per-row entries, read-only accepted-offer section, label cleanup, mandatory signature validation
- Owner / buyer "primary contact" star for call/email routing
- Accepted offer price shown on the buyer and seller portals
- Buyer and seller solicitor sub-groups in the admin offer view
- Buyer and seller portal file uploads (with a security fix preventing access to other clients' files)
- Condition badges suppressed for cash and unconditional offers
- **Map filter rebuilt** — circle/radius replaced with polygon drawing, with an auto-placed rectangle on address selection

---

### May 29 — ~9.5 h

**Early morning (~2.5 h):**
- Map filter polygon tool upgraded to a proper drawing toolbar
- BUYERS inline section for the accepted buyer in the Edit Property dialog
- Building-inspection recommendation styled as a question box

**Midday (~3.9 h):**
- Sales info and buyer-offers sections hidden once an offer is accepted; dialog layout restructured for the no-offer state
- "Send via email" button for the seller portal link
- Solicitor section shown in the offer submission panel
- Buyer fields restyled to match the owner section

**Evening (~3.3 h):**
- Per-row map button on the property list with automatic geocoding/pin
- Portal notification emails fixed to use the correct site address (no more localhost links in production)
- Property Details section expands by default when adding a new property
- Buyer primary-contact star on the edit dialog and list rows
- **Adobe Sign integration — Phase 3a–3d:** client, health monitoring, mock mode, database schema, agreement creation, and send-for-signature UI
- Buyer portal send-link and "Open portal" button

---

### May 30 — ~4 h

**Midnight carry-over (~2.7 h):**
- **Adobe Sign Phase 3e/3f:** webhook handler for signing completion (with a security token guard) and signing-status tracking UI
- Per-option favourite and hide controls on the status filter
- Entity dialog property connections default to the source property
- Restored an offer button dropped during a buyer panel restyle

**Morning (~1.45 h):**
- **Adobe Sign Phase 3g/3h:** portal client UI, end-to-end tests, session refresh, and an authentication fix
- Signing-reminder fix (correct recipient handling for the Adobe Sign API)

---

### May 31 — ~9.5 h

**Morning (~3 h):**
- Status filter: "Favorites-only" button, with starred selections preserved on Clear and when hiding (starred-hidden sorted to top)
- Print button added to the Offer Form Submission panel
- Green highlight for properties with due / overdue condition dates; ticked favorites sorted to the top of the group
- Verification-story coverage — a documented scene per asserted behaviour (6 scenes)

**Afternoon (~3 h):**
- Representatives search and a dedicated Contacts page
- Due-date green highlight refined to require a contract first
- Test-tooling improvements and a documented browser-test policy

**Evening (~3.5 h):**
- Yellow "3-day warning" tier for upcoming due dates
- Cooling-off period resolved automatically from the property type and any waiver
- Cooling-off-period client questionnaire prepared

---
