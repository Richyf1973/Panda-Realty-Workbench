# Panda Realty — Kanban Board Feature Spec

Confirmed by client (Richard) on 2026-04-12. **Updated 2026-04-13** — Buyers pipeline card model and sub-pipeline clarified via client conversation.

**Wireframes:** See [KANBAN-WIREFRAME.md](./KANBAN-WIREFRAME.md) for screen-by-screen layout diagrams.

---

## Overview

A Kanban board visualising the flow of the business — Properties, Sellers, Buyers, Contacts and the interactions between them. Accessible from the Properties page via a **List / Board toggle**. The board is the **default view when the app first opens**.

There are **two separate pipelines** — one for Sellers and one for Buyers — switchable from the same page.

- **Sellers pipeline:** Cards represent **properties**. Only properties marked as Favourite appear. Each card moves through seller stages (To Be Appraised → Settlement Date).
- **Buyers pipeline:** Cards represent **buyer people** (contacts). One card per buyer, showing which properties they are enquiring about and what stage they are at with those properties.

### Sub-pipeline (deal board)
When an offer is accepted on a property, a **separate deal pipeline** opens within that property's detail view. This keeps the main board uncluttered — the deal stages (Conditions → Unconditional → Settlement) live inside the property, not as extra columns on the main board.

---

## Pipelines & Stages

### Sellers Pipeline

| # | Stage |
|---|---|
| 1 | To Be Appraised |
| 2 | Appraised |
| 3 | Follow Up |
| 4 | Form 6 Signed |
| 5 | Advertising Payment Received |
| 6 | Disclosure Signed |
| 7 | Sale Contract Signed |
| 8 | Conditions |
| — | ↳ Cooling Off Due Date |
| — | ↳ BPI Due |
| — | ↳ Finance Due Date |
| — | ↳ Searches |
| — | ↳ Balance Deposit Due Date |
| 9 | Unconditional Date |
| 10 | Settlement Date |

### Buyers Pipeline

> **Updated 2026-04-13:** Cards in the Buyers pipeline represent **buyer people (contacts)**, not properties. One card per buyer, showing which properties they are enquiring about and what stage they are at. Confirmed by Richard.

| # | Stage |
|---|---|
| 1 | Enquiry |
| 2 | Contact Made |
| 3 | Negotiations Started |
| 4 | Viewing Scheduled |
| 5 | Offer Made |
| 6 | Disclosure Signed |
| 7 | Sale Contract Signed |
| 8 | Conditions |
| — | ↳ Cooling Off Due Date |
| — | ↳ BPI Due |
| — | ↳ Finance Due Date |
| — | ↳ Searches |
| — | ↳ Balance Deposit Payable |
| 9 | Unconditional |
| 10 | Sold / Settlement |

> **Decision:** The "Conditions" stage sub-milestones (Cooling Off Due Date, BPI Due, Finance Due Date, Searches, Balance Deposit Due/Payable) will be shown as **date fields inside the card detail panel**, not as separate columns. This keeps the board usable — 5 extra columns just for due dates would make it too wide. See wireframe Section 10.

### Sub-pipeline (deal board — nested inside a property)

> **Updated 2026-04-13:** Confirmed by Richard — "board within a board" means a separate pipeline that opens inside a property's detail view once an offer is accepted. Stages mirror the later seller/buyer deal stages. Purpose: keeps the main board uncluttered.

When a property has an accepted offer, the deal pipeline becomes visible inside the property detail panel. Stages:

| # | Stage |
|---|---|
| 1 | Offer Accepted |
| 2 | Conditions |
| — | ↳ Cooling Off Due Date |
| — | ↳ BPI Due |
| — | ↳ Finance Due Date |
| — | ↳ Searches |
| — | ↳ Balance Deposit Due Date |
| 3 | Unconditional |
| 4 | Settlement |

> **Resolved 2026-04-13:** Implemented as a **progress stepper** in the Summary tab of `PropertyDetailPanel`. Rationale: 4 stages are strictly linear; a stepper is clearer than a mini Kanban in this context and fits inside the Sheet panel without crowding. See wireframe Section 10.

---

## The Board

### Which properties appear
- Only properties marked as **Favourite** appear on the board.
- All favourites are shown — no filtering by suburb, agent, or property type.

### Card contents (at a glance)
- Property address and suburb
- Asking price or last appraised amount
- Primary buyer's name (if one is linked)
- Small indicator for recent activity or overdue task

### Sorting
- Most recently active properties appear at the top of each column by default.

### Moving cards
- **Drag and drop** is the primary interaction — drag a card from one column and drop it into another.
- Dropping a card updates the property's status in the database immediately.
- The stage can also be changed from inside the detail view (dropdown), which moves the card on the board.

---

## The Detail View (clicking a card)

Opens a full detail panel for the selected property.

### Sections

| Section | Contents |
|---|---|
| **Summary** | Address (street + suburb + state + postcode), type, current stage, appraised value, contract price (when an offer is accepted), commission rate, date added, contract date — **not** the historical listing ask (`sale_price`) |
| **Buyers** | Linked buyers, their contact details, offers they have made |
| **Contacts** | Sellers, agents, other parties — with contact details |
| **Notes** | Running history of notes; ability to add a new note inline |
| **Files** | Attached documents, contracts, images; ability to upload |
| **Offers** | Log of all offers with amounts and dates; which was accepted |
| **Timeline / History** | Chronological log of all activity — stage changes, notes, files, offers |
| **Call / Email Log** | Deferred — omit this tab for now; see Out of Scope |

### Actions from the detail view
- Change the property's stage (moves the card on the board)
- Add a note
- Upload a file
- Mark as Won or Lost
- Add or remove a buyer or contact
- Log an activity or follow-up task
- ~~Log a call or email~~ *(deferred — see Out of Scope)*

---

## Where It Lives

### Entry point
- A **List / Board toggle** on the existing Properties page (similar to a view switcher).
- The **Kanban (Board) view is always the default** — no per-user persistence, always opens to Board.
- Switching to List restores the current table/grid view for the current session only.

### Navigation
- The pipeline switcher (Sellers / Buyers) lives within the board view itself — e.g. a tab or button group at the top of the board.

---

## Existing Codebase Context

An implementing agent should read these files before starting:

| What | Where |
|---|---|
| Database schema | `apps/panda-realty/db/schema.ts` |
| Property status lookup table | `panda_property_status` in schema — currently a flat shared list, needs a `pipeline` column added |
| Favourite flag | `panda_properties.is_favorite` — boolean, already exists; the board filters on this |
| Property→entity relationships | `property_entities` table — links properties to buyers, sellers, contacts |
| Buyer offers | `buyer_offers` table — offer amounts per property-entity link |
| Property notes | `property_entity_notes` table |
| Property files | `property_entity_files` table |
| Admin page shell pattern | `packages/admin/` — all existing admin pages use `AdminEntityPageShell`; the Kanban is a **custom standalone page**, not an admin entity page |
| App entry route | `apps/panda-realty/app/` — the board should be the default landing page |
| Skills to read | `.agents/skills/drizzle/SKILL.md` (DB/migrations), `.agents/skills/tanstack-form/SKILL.md` (forms in detail panel) |

---

## Database Status Audit (checked 2026-04-13)

The existing `property_status` table was queried and compared against the pipeline stages the client confirmed. They are almost entirely different datasets.

### Current statuses in the DB

| Code | Notes |
|---|---|
| To Be Appraised | ✅ Exists in Sellers pipeline |
| Appraised | ✅ Exists in Sellers pipeline |
| Recently Appraised | Not in either pipeline |
| On the Market | Not in either pipeline |
| Under Contract | Not in either pipeline |
| Unconditional | ✅ Close match — Sellers has "Unconditional Date", Buyers has "Unconditional" |
| Coming Soon | Not in either pipeline |
| Watch List | Not in either pipeline |
| Quiet Listing | Not in either pipeline |
| Sold My Panda | Not in either pipeline |
| Sold Recently My Panda | Not in either pipeline |
| Listed With Another Agent | Not in either pipeline |
| Archived | Not in either pipeline |

### Conclusion

Only 3 values have any overlap. The current statuses reflect **market visibility** (On the Market, Coming Soon, Watch List, etc.), not a sales pipeline workflow. The pipeline stages the client wants are almost entirely new records.

### Post-implementation corrections (applied 2026-04-13)

During visual QA of the board shell the following data issues were discovered and fixed:

1. **Corrupted display labels:** The seed migration wrote numeric sort-order values into `property_status` (the display label column) for the 3 pre-existing rows it updated (`To Be Appraised`, `Appraised`, `Unconditional`). Fixed by setting the display labels to their correct string values.
2. **Rogue buyers row:** The legacy `Unconditional` row (market-visibility status) had `pipeline='buyers'` from the seed, causing a spurious 11th column. Detached it (`pipeline = NULL`) since the new `Buyers - Unconditional` row (property_status_code = `'Buyers - Unconditional'`) now covers that stage.
3. **Missing Buyers Unconditional row:** The seed migration left a gap at identity position 35 — `Sold / Settlement` landed at id=36 before the `Buyers - Unconditional` row existed. Added the row (`property_status_code = 'Buyers - Unconditional'`, `property_status = 'Unconditional'`, `pipeline = 'buyers'`).
4. **Sort order:** Added `sort_order integer` column to `property_status` and seeded values 1–10 per pipeline per spec order. The query in `board/queries.ts` orders by `sort_order ASC` (with `propertyStatusId` as tiebreaker). Updated `db/schema.ts` to include `sortOrder`.

### Recommended approach for the implementing agent

- **Keep** the existing statuses as-is — they are used by the regular Properties list view and should not be removed.
- **Add a `pipeline` column** to the `property_status` table with values: `sellers`, `buyers`, or `null` (null = existing non-pipeline statuses).
- **Seed the new pipeline stages** as new rows with the appropriate `pipeline` value.
- The Kanban board queries only rows where `pipeline = 'sellers'` or `pipeline = 'buyers'`. The Properties list continues to use all statuses as before.

### Won / Lost decision

Won / Lost is a **boolean flag on the `panda_properties` record**, not a pipeline stage. A property can be marked Won or Lost from any stage without moving it. Two new columns needed: `is_won` and `is_lost` (both boolean, default false). The detail panel shows Won / Lost buttons that toggle these flags.

---

## Open Implementation Questions

### Resolved
All original implementation questions resolved. See Database Status Audit above.

### Resolved — from client conversation 2026-04-13

1. **Buyers pipeline card model** — ✅ resolved. Cards represent buyer–property deals (`property_entities` rows, `entityCategoryId=1`). Stage stored on `property_entities.buyer_pipeline_status_id`. Implemented 2026-04-13.
3. **Buyers card contents** — ✅ resolved. Card shows: buyer name (person icon), property address (home icon), recent-activity dot. See wireframe Section 3.5. Implemented 2026-04-13.

### Still open

*(none — all questions resolved)*

> **Sub-pipeline UI — resolved 2026-04-13:** Implemented as a **progress stepper** (not mini Kanban). Rationale: 4 stages are strictly linear (Offer Accepted → Conditions → Unconditional → Settlement), a stepper communicates sequential progress more clearly in real estate context, and a mini Kanban would be cramped inside the Sheet panel. See progress tracker above.

---

## Out of Scope (for now)

- Filtering the board by suburb, agent, or property type — Richard confirmed "show all favourites."
- Any public-facing or client-portal version of this board.
- Automated notifications or reminders tied to due dates.
- Call / Email log — deferred to a future phase. The detail panel should omit that tab for now.

---

## Progress Tracker

- [x] Extend data model — `pipeline` column on `property_status`, seed new stages, `is_won`/`is_lost` on `panda_properties`
- [x] `sort_order` column on `property_status` — added to guarantee correct column ordering within each pipeline (ID-based ordering was unreliable for the 3 pre-existing rows that were updated rather than inserted by the seed migration)
- [x] Board page shell — `apps/panda-realty/app/admin/properties/page.tsx` — static route overrides `[slug]`; defaults to Board; List/Board toggle via `?view=` param; Sellers/Buyers pipeline tabs via `?pipeline=` param; 10 column headers rendered from live DB, horizontally scrollable; List view delegates to existing `AdminEntityPageShell`
- [x] QA — board shell verified at 1920×1080 (desktop) and 390×844 (mobile) via Playwright visual capture; list view verified; both pipelines verified
- [x] Property cards inside each column — address (star + line-clamp-2), formatted price, buyer name, green recency dot (updatedAt within 7 days); column header count live; `fetchFavoritePropertiesForPipeline` returns `Map<statusId, PropertyCard[]>`
- [x] Detail panel — right-side Sheet opens on card click; fixed header (address, type/stage subtitle, 4 data pills, Won/Lost read-only badges, Back to board close button); 7-tab bar (Summary, Buyers, Contacts, Notes, Files, Offers, History); scrollable content; loading skeletons; empty states; add-note form with refetch; files read-only list; offers table; history timeline. Files: `kanban-board-client.tsx`, `panel-queries.ts`, `add-note-action.ts`, `property-detail-panel.tsx`. QA'd via Playwright visual capture 2026-04-13.
- [x] Conditions due dates — Summary tab **Condition Due Dates** lists milestones from the accepted `buyer_offers` day counts + `panda_properties.contract_date` (computed dates). Rows appear only when the saved day count is **greater than zero** (Finance also hidden when cash offer; all condition rows hidden when **No conditions**). Playwright: `pipeline-property-detail-summary.spec.ts`, `offer-conditions-calendar.spec.ts` (Calendar tab list).
- [x] Won / Lost buttons — `togglePropertyWon` / `togglePropertyLost` Server Actions in `toggle-won-lost-action.ts`; panel header badges replaced with toggle buttons (emerald when won, red when lost, muted when inactive); `toggling` state prevents double-clicks; refetch after each toggle; QA'd via Playwright visual capture 2026-04-13
- [x] Drag and drop — `@dnd-kit/core` + `@dnd-kit/utilities`; `DndContext` wraps board; `KanbanColumn` → `useDroppable`; `KanbanCard` → `useDraggable`; `DragOverlay` ghost; optimistic local state update; `movePropertyToStage` Server Action writes `property_status_id` to DB; source column suppresses drop-target highlight; `PointerSensor` with `distance: 8` activation threshold preserves card-click-to-panel; QA'd via Playwright visual capture 2026-04-13

### Pending — spec updated 2026-04-13

- [x] **Buyers pipeline redesign** — cards represent buyer *people* (one card per `property_entities` row). New `buyer_pipeline_status_id` FK on `property_entities`; `BuyerCard` type + `fetchBuyerCardsForPipeline` query; `BuyerKanbanCard` / `BuyerColumn` components; `moveBuyerToStage` server action; `BuyerDetailPanel` (Overview / Offers / Notes tabs). Implemented 2026-04-13.
- [x] **Buyer card contents** — buyer name (person icon), property address (home icon), recent-activity dot (7-day window). Implemented 2026-04-13.
- [x] **Sub-pipeline (deal board)** — progress stepper inside Summary tab of `PropertyDetailPanel`; visible once an offer is accepted (`buyer_offers.is_accepted = true`); 4 stages: Offer Accepted → Conditions → Unconditional → Settlement; `deal_stage_status_id` (nullable FK) on `panda_properties`; 4 rows seeded in `property_status` with `pipeline='deal'`; `moveDealToStage` server action; clickable steps advance the deal stage; QA'd via Playwright 2026-04-13.
