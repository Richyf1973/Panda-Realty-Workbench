# Panda Realty — Kanban Board Wireframes

Text-based wireframes for the Kanban feature. These show layout and structure only — not final visual design.

---

## 1. Properties Page — Default State (Board View)

This is what Richard sees when the app opens.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  🏠  Panda Realty                                              [User avatar]  [Sign out] │
├──────────┬──────────────────────────────────────────────────────────────────────────────┤
│          │                                                                               │
│  🏠 Home │  Properties                                    [☰ List]  [⊞ Board] ← toggle │
│          │                                                                               │
│  👥 Enti │  ┌─ Pipeline ──────────────────────────────┐                                 │
│          │  │  [ Sellers ]   [ Buyers ]               │  ← tab switcher                 │
│  ⚙️  ...  │  └─────────────────────────────────────────┘                                 │
│          │                                                                               │
│          │  ← scrolls horizontally →                                                    │
│          │                                                                               │
│          │  [Board columns — see Section 2]                                              │
│          │                                                                               │
└──────────┴───────────────────────────────────────────────────────────────────────────────┘
```

**Notes:**
- The toggle `[☰ List]  [⊞ Board]` sits top-right of the Properties page header. Board is active by default (highlighted).
- The pipeline tabs `[ Sellers ]  [ Buyers ]` sit just below the header, above the columns.
- Clicking `☰ List` switches to the existing table/grid view.

---

## 2. Board View — Sellers Pipeline

Horizontally scrollable. Each column is a stage.

```
┌──────────────────────────────────────────────────────────────────────── → scroll →  ─────┐
│                                                                                           │
│  [ Sellers ]  [ Buyers ]                                                                  │
│                                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ TO BE APPRAISED │  │    APPRAISED    │  │    FOLLOW UP    │  │ FORM 6 SIGNED   │ ···  │
│  │    2 cards      │  │    1 card       │  │    3 cards      │  │    1 card       │     │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤     │
│  │                 │  │                 │  │                 │  │                 │     │
│  │ [Card A]        │  │ [Card C]        │  │ [Card D]        │  │ [Card G]        │     │
│  │                 │  │                 │  │                 │  │                 │     │
│  │ [Card B]        │  │                 │  │ [Card E]        │  │                 │     │
│  │                 │  │                 │  │                 │  │                 │     │
│  │                 │  │                 │  │ [Card F]        │  │                 │     │
│  │                 │  │                 │  │                 │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                                           │
│  [continues →]  ADV. PAYMENT REC.  │  DISCLOSURE SIGNED  │  SALE CONTRACT SIGNED  │ ··· │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Full column order — Sellers:**
1. To Be Appraised
2. Appraised
3. Follow Up
4. Form 6 Signed
5. Advertising Payment Received
6. Disclosure Signed
7. Sale Contract Signed
8. Conditions *(see note below)*
9. Unconditional Date
10. Settlement Date

> **Conditions column note:** The "Conditions" stage has 5 sub-milestones (Cooling Off Due Date, BPI Due, Finance Due Date, Searches, Balance Deposit Due Date). These will be shown as **date fields inside the card**, not as separate columns, to keep the board usable.

---

## 3. Board View — Buyers Pipeline

Same layout, different column sequence.

```
┌──────────────────────────────────────────────────────────────────────── → scroll →  ─────┐
│                                                                                           │
│  [ Sellers ]  [ Buyers ]                                                                  │
│                                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │    ENQUIRY      │  │  CONTACT MADE   │  │ NEGOTIATIONS    │  │    VIEWING      │ ···  │
│  │    3 cards      │  │    2 cards      │  │   STARTED       │  │   SCHEDULED     │     │
│  │                 │  │                 │  │    1 card       │  │    2 cards      │     │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤     │
│  │ [Card A]        │  │ [Card D]        │  │ [Card F]        │  │ [Card G]        │     │
│  │ [Card B]        │  │ [Card E]        │  │                 │  │ [Card H]        │     │
│  │ [Card C]        │  │                 │  │                 │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                                           │
│  [continues →]  OFFER MADE  │  DISCLOSURE SIGNED  │  SALE CONTRACT SIGNED  │  ···       │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Full column order — Buyers:**
1. Enquiry
2. Contact Made
3. Negotiations Started
4. Viewing Scheduled
5. Offer Made
6. Disclosure Signed
7. Sale Contract Signed
8. Conditions *(date fields inside card, not separate columns)*
9. Unconditional
10. Sold / Settlement

---

## 3.5 Individual Buyer Card (Buyers Pipeline)

Cards in the Buyers pipeline represent **buyer people** (one card per `property_entities` row — one buyer–property deal). Implemented 2026-04-13.

```
┌─────────────────────────────┐
│  👤  Amanda Highley          │  ← buyer name (person icon)
│                             │
│  🏠  4 Valencia Court,      │  ← linked property address
│       Bellmere              │    (home icon, 2-line clamp)
│                             │
│  ● Recent activity          │  ← green dot if updated < 7 days
└─────────────────────────────┘
```

**Card identity:** Each card is one `property_entities` row (a single buyer–property deal). A buyer linked to 3 properties = 3 independent cards, each draggable to its own stage.

**Stage stored on:** `property_entities.buyer_pipeline_status_id` FK → `property_status`. Drag updates only that row.

**Click behaviour:** Opens `BuyerDetailPanel` (right-side sheet) showing Overview (property + latest offer), Offers table, and Notes for that specific buyer–property deal.

---

## 4. Individual Property Card

Each card in a column looks like this:

```
┌─────────────────────────────┐
│ ★  12 Maple St, Sunnybank   │  ← address (★ = favourite indicator)
│                             │
│    $485,000                 │  ← asking price or appraised amount
│                             │
│    👤 Jane Cooper           │  ← primary buyer (if linked)
│                             │
│    🔴 Overdue task          │  ← activity indicator (red = overdue,
└─────────────────────────────┘     green = recent activity, none = quiet)
```

**Drag behaviour:** User grabs the card and drags it left or right into another column. On drop, the stage updates in the database and the card settles in the new column.

---

## 5. Detail Panel — Opens on Card Click

Slides in from the right (or opens as a full-width overlay on smaller screens).

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ← Back to board                                          [Won ✓]  [Lost ✗]  [···]  │
│  ※ Won / Lost are boolean flags on the property — toggling does not change the stage │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  12 Maple Street, Sunnybank QLD 4109                                                 │
│  House  ·  Currently: Appraised                    Stage: [ Appraised        ▾ ]    │
│                                                                                      │
│  Appraised: $470,000    Commission: 2.5%    Added: 01 Apr 2026                      │
│                                                                                      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  [ Summary ] [ Buyers ] [ Contacts ] [ Notes ] [ Files ] [ Offers ] [ History ]     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ▼  SUMMARY                                                                          │
│                                                                                      │
│     Address:     12 Maple Street, Sunnybank QLD 4109                                 │
│     Type:        House                                                               │
│     Stage:       Appraised                                                           │
│     Appraised:   $470,000                                                            │
│     Commission:  2.5%                                                                │
│     Added:       1 April 2026                                                        │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Detail Panel — Buyers Tab

```
├──────────────────────────────────────────────────────────────────────────────────────┤
│  [ Summary ] [ Buyers ] [ Contacts ] [ Notes ] [ Files ] [ Offers ] [ History ] ··· │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ▼  BUYERS                                                            [+ Add Buyer] │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  Jane Cooper                                                                 │    │
│  │  📞 0412 345 678   ✉️  jane@email.com                                        │    │
│  │  Offers: $460,000 (03 Apr) · $470,000 (07 Apr) ← latest                    │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  Tom Richards                                                                │    │
│  │  📞 0422 111 222   ✉️  tom@email.com                                         │    │
│  │  Offers: $455,000 (05 Apr)                                                  │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Detail Panel — Notes Tab

```
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ▼  NOTES                                                                            │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  Type a new note...                                          [Add Note]     │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ── 07 Apr 2026 ────────────────────────────────────────────────────────────────    │
│  "Spoke with Jane — she is keen but waiting on finance approval."                   │
│                                                                                      │
│  ── 03 Apr 2026 ────────────────────────────────────────────────────────────────    │
│  "First offer received at $460k. Vendor wants at least $475k."                      │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Detail Panel — Offers Tab

```
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ▼  OFFERS                                                                           │
│                                                                                      │
│  ┌────────────────┬──────────────┬────────────┬──────────────────────────────────┐  │
│  │  Buyer         │  Amount      │  Date      │  Status                          │  │
│  ├────────────────┼──────────────┼────────────┼──────────────────────────────────┤  │
│  │  Jane Cooper   │  $470,000    │  07 Apr    │  ✅ Accepted                     │  │
│  │  Jane Cooper   │  $460,000    │  03 Apr    │  —                               │  │
│  │  Tom Richards  │  $455,000    │  05 Apr    │  —                               │  │
│  └────────────────┴──────────────┴────────────┴──────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Detail Panel — Conditions (inside the card when stage = "Conditions")

When a property reaches the Conditions stage, the Summary section expands to show the due date fields.

```
│  ▼  SUMMARY  —  Stage: Conditions                                                    │
│                                                                                      │
│     Address:              12 Maple Street, Sunnybank QLD 4109                        │
│     Stage:                Conditions                                                 │
│     Appraised:            $470,000                                                   │
│                                                                                      │
│     ── Condition Due Dates ──────────────────────────────────────────────────────    │
│     Cooling Off:          15 Apr 2026   🔴 overdue                                  │
│     BPI Due:              18 Apr 2026                                               │
│     Finance Due:          22 Apr 2026                                               │
│     Searches:             20 Apr 2026                                               │
│     Balance Deposit Due:  25 Apr 2026                                               │
│                                                                                      │
```

---

## 10. Detail Panel — Deal Pipeline Stepper (Summary tab, accepted offer only)

Appears at the bottom of the Summary tab **only when the property has at least one accepted offer**. Implemented as a horizontal progress stepper — 4 stages are strictly linear so a stepper communicates progress more clearly than a mini Kanban.

```
│  ── DEAL PIPELINE ──────────────────────────────────────────────────────────    │
│                                                                                  │
│  ①──────────────②──────────────③──────────────④                               │
│  ✓              ●              ○              ○                                │
│  Offer          Conditions     Unconditional  Settlement                        │
│  Accepted       (current)                                                       │
│                                                                                  │
│  ✓ = completed (green filled)                                                    │
│  ● = current stage (primary colour filled)                                       │
│  ○ = future stage (outlined, muted)                                              │
│                                                                                  │
│  Each circle is clickable — clicking sets that stage as current and persists.   │
│                                                                                  │
```

**Empty state (no accepted offer):**
```
│  ── DEAL PIPELINE ──────────────────────────────────────────────────────────    │
│                                                                                  │
│  [ No accepted offer yet. Deal pipeline becomes active once an offer            │
│    is accepted. ]                                                                │
│                                                                                  │
```

**Data model:** `panda_properties.deal_stage_status_id` FK → `property_status` where `pipeline='deal'`. 4 rows seeded (IDs 38–41, sort_order 1–4). Action: `moveDealToStage(propertyListId, dealStatusId)`.

---

## 11. Detail Panel — History / Timeline Tab

```
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ▼  HISTORY                                                                          │
│                                                                                      │
│  ── 07 Apr 2026 ────────────────────────────────────────────────────────────────    │
│  📋 Stage changed:  Follow Up  →  Appraised                                         │
│                                                                                      │
│  ── 05 Apr 2026 ────────────────────────────────────────────────────────────────    │
│  💰 Offer received: $455,000 from Tom Richards                                       │
│                                                                                      │
│  ── 03 Apr 2026 ────────────────────────────────────────────────────────────────    │
│  📝 Note added                                                                       │
│                                                                                      │
│  ── 01 Apr 2026 ────────────────────────────────────────────────────────────────    │
│  ➕ Property added to board                                                          │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Drag and Drop Interaction

What happens when a card is being dragged:

```
  ┌─────────────────┐        ┌─────────────────┐
  │ TO BE APPRAISED │        │    APPRAISED    │
  │    1 card       │        │    1 card       │
  ├─────────────────┤        ├─────────────────┤
  │                 │        │                 │
  │ [Card B]        │  drag  │ [Card C]        │
  │                 │   →    │                 │
  │ ┌ ─ ─ ─ ─ ─ ┐  │        │ ┌ ─ ─ ─ ─ ─ ┐  │  ← drop target
  │   Card A        │        │                 │     (highlighted)
  │ └ ─ ─ ─ ─ ─ ┘  │        │ └ ─ ─ ─ ─ ─ ┘  │
  │  (being dragged)│        │                 │
  └─────────────────┘        └─────────────────┘
```

- The dragged card becomes semi-transparent while in motion.
- The target column highlights to show it is a valid drop zone.
- On drop: card snaps into place, stage updates in the database, history log records the change.

---

## Screen Size Notes

| Screen | Board behaviour | Detail panel behaviour |
|---|---|---|
| Desktop (≥1280px) | All columns visible, horizontal scroll for overflow | Slides in from the right, board stays visible behind it |
| Tablet (768–1279px) | 3–4 columns visible, horizontal scroll | Detail panel takes ~60% of screen width |
| Mobile (<768px) | 1–2 columns visible, horizontal scroll | Detail panel opens full screen |
