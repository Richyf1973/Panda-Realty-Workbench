# Panda Realty — Favourites Kanban Board: Confirmed Spec Summary

Hi Richard,

This is the updated summary of everything we have confirmed for the Kanban board feature. All open questions from the earlier proposal have been answered and are reflected below.

---

## What This Feature Is

A **List / Board toggle** on the existing Properties page. The Board view is the **default** — it is what you see when the app first opens. Switching to List restores the current table/grid view for the session.

Only properties you have marked as **Favourite** appear on the board. No filtering by suburb, agent, or property type — all favourites are shown.

---

## Two Pipelines

There are **two separate pipelines**, switchable via a tab at the top of the board:

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
| 9 | Unconditional Date |
| 10 | Settlement Date |

### Buyers Pipeline

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
| 9 | Unconditional |
| 10 | Sold / Settlement |

**Conditions sub-milestones:** The Conditions stage has 5 due dates (Cooling Off, BPI Due, Finance Due, Searches, Balance Deposit). These appear as **date fields inside the card detail panel**, not as extra columns — keeps the board readable.

---

## The Cards

Each card on the board shows at a glance:

- Property address and suburb
- Asking price or appraised amount
- Primary buyer's name (if one is linked)
- Activity indicator (red = overdue task, green = recent activity)

Cards are sorted by most recently active first within each column.

---

## Moving Cards

**Drag and drop** is the primary way to move a property between stages. Dropping a card updates the property's status in the database immediately. You can also change the stage from a dropdown inside the detail panel if you prefer.

---

## Clicking a Card (The Detail Panel)

Clicking any card opens a full detail panel. Tabs:

| Tab | What it shows |
|---|---|
| **Summary** | Address, type, suburb, current stage, asking price, appraised value, commission rate, date added |
| **Buyers** | Linked buyers with contact details and offers they have made |
| **Contacts** | Sellers, agents, and other linked parties with contact details |
| **Notes** | Running note history with ability to add a new note inline |
| **Files** | Attached documents and images with ability to upload new files |
| **Offers** | Log of all offers with amounts, dates, and which was accepted |
| **History** | Chronological log of all activity — stage changes, notes, files, offers |

**From the detail panel you can:**
- Change the property's stage (moves the card on the board)
- Add a note
- Upload a file
- Mark as **Won** or **Lost** (boolean flags — does not change the pipeline stage)
- Add or remove a buyer or contact
- Log an activity or follow-up task

---

## Won / Lost

Won and Lost are **toggle buttons** in the detail panel — they are flags on the property record, not stages. A property can be marked Won or Lost from any stage at any time.

---

## Where It Lives

The board lives on the **existing Properties page** via a List / Board toggle in the page header. There is no separate navigation item. The board always opens by default — no per-user preference is saved.

---

## Out of Scope (for now)

- Filtering by suburb, agent, or property type
- Call / Email log (deferred to a future phase)
- Automated notifications or reminders tied to due dates
- Any public-facing or client-portal version of this board

