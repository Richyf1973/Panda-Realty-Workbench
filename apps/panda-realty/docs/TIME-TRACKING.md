# Panda Realty — Work Log (Mar 30 – Apr 30, 2026)

## Summary

| Period | Days Active | Est. Hours |
|--------|-------------|------------|
| Mar 30 – Apr 10 | 11 | ~64 h |
| Apr 11–19 | 9 | ~60 h |
| Apr 20–30 | 11 | ~63.5 h |
| **Total** | **31** | **~187.5 h** |

---

## Day-by-day breakdown

### Mar 30 — ~7 h

**Initial admin infrastructure setup**

- Contact categories management (admin CRUD)
- Entities admin CRUD with entity categories registry
- Master List navigation with toggle and entities section
- Properties admin entity (panda_properties table)
- Entity column alignment and width configuration

---

### Mar 31 — ~6 h

**Morning (~1 h):** Sale date DD/MM/YYYY display formatting

**Evening (~5 h):** Property dialog form foundation

- Entity members inline tab in entity CRUD dialog
- 3-column grid layout for entity forms
- Custom properties dialog form body hook
- Per-tab scrolling in edit property dialog
- Property entities relationship tab with async entity search

---

### Apr 1 — ~8 h

**Morning (~1.5 h):** Live data assertions for property entities in edit dialog (E2E test coverage)

**Afternoon (~5 h):**

- Sales Information tab with computed commission amount and buyer offers scaffold
- Currency input field (formatted)
- Sidebar navigation fixes (consistent rendering of entities nav item)

**Evening (~1.5 h):**

- Many-to-many buyer status relationship
- Buyer status selection via checkbox form

---

### Apr 2 — ~4.5 h

- Owner column in properties list with row-click-to-edit
- Buyer statuses entity enhancement (metadata and configuration)
- Category collections with entity ID labels
- Initial XLSX import dependency and pandaProperties schema expansion

---

### Apr 3 — ~4 h

- Multiple owner fields (owner1/owner2/owner3) with combined display in list
- Contact category field conditionally hidden for non-Contact entity types
- Duplicate status label fix in property status dropdown
- Inline server-side field validation errors per field
- XLSX import: auto-detect header/data start row

---

### Apr 5 — ~10 h

**Morning/afternoon (~7.5 h):**

- XLSX import split into insert-only vs. upsert modes
- Owner contacts import, owner type import, batched owner-address sync
- isFavorite toggle in property form + Favorites filter in property list
- Property status badge as first column in properties list (replaces ID column)
- Bottom tabs conditionally rendered based on isFavorite state
- Buyer workspace with nested CRUD dialog (files, notes, property entity management)
- Nested CRUD dialogs for buyers, contacts, and tenants tabs
- Side rail rendering for additional fields in entity CRUD dialog
- Async combobox for buyer selection in properties dialog

**Evening (~3 h):**

- Date offered field in buyer offers
- Buyer offers table layout and visibility improvements
- Accepted offer validation in buyer offers management
- Latest Buyer Offers stays mounted on inactive Sales tab
- E2E test coverage for buyer offer updates

---

### Apr 6 — ~7 h

**Midnight carry-over (~30 min):** Buyer offers E2E test refinements

**Midday (~3.5 h):**

- Gmail OAuth integration for lead import
- Lead deduplication (lead_imports table with unique constraint on source email + ad ID)
- HTML email parsing and boilerplate stripping for cleaner lead notes
- Lead import toolbar UI improvements (custom Select component)

**Evening (~3 h):**

- Event timelines database table for tracking transaction milestones
- Event Timeline tab in properties form and favorites view
- Properties dialog form modularized into separate files

---

### Apr 7 — ~9.5 h

**Early morning (~1 h):** Event timeline display consolidation in properties dialog

**Morning (~2.5 h):**

- Lead import parser: optional phone number handling
- Google OAuth scope expansion for Contacts access
- Property reference display in entity forms
- Google Drive file management for property entities (new file attributes in schema)

**Midday/afternoon (~4 h):**

- Property types management (admin CRUD with filters and combobox)
- Suburb management (admin CRUD with filters and UI components)
- Enhanced property filters: boolean filter UI styles, new layout options, sync functionality
- Search trigger options: debounce vs. submit mode for list search
- XLSX import: new fields for valuation and ownership details
- Dynamic owner fields in property form (conditionally show additional owners, add more)

**Evening (~1.5 h):**

- Commission amount display tied to accepted offer amount
- Land size field added to property entity schema

---

### Apr 8 — ~2 h

- Address type conversions integrated into property forms
- External link buttons to real estate listing page and Google Maps in entity list
- Property form top bar button styling improvements
- Label correction (Estate → State) and entity ID string type fix

---

### Apr 9 — ~3 h

**Midnight carry-over (~1.5 h):**

- Interactive Leaflet map with street filter for property listings
- Address search with abort controller and improved error handling

**Afternoon (~1.5 h):**

- Google Contacts sync in lead import toolbar
- Street filter URL encoding fix in property map

---

### Apr 10 — ~3 h

**Midnight carry-over (~1.5 h):**

- Advanced property filters: zoning, development zone, land use, sale price range, appraised amount, sale date range

**Evening (~1.5 h):**

- Collapsible property details section in the property form
- Date input handling improvements

---

### Apr 11 — ~3 h

**Midnight carry-over (~30 min):**

- Property form: improved input validation and user feedback for field errors

**Evening (~2.5 h):**

- Properties export toolbar wired into admin client registry
- Filter summary row formatting improvements in properties export

---

### Apr 12 — ~5 h

**Early morning (~2 h):**

- Database backup scripts added with automatic pg binary resolution
- Client DB preparation steps integrated into backup flow
- Archiver dependency added

**Midday (~3 h):**

- Admin navigation streamlined; event timelines removed from property form
- Clickable phone and email fields in property form linking to contacts
- PDF export integrated (jsPDF + autotable) for property listings
- Multi-page PDF layout with optimized column widths

---

### Apr 13 — ~13 h

**Morning (~2 h):**

- Kanban board proposal docs updated with confirmed features
- Properties data model extended: pipeline flags, won/lost status fields
- User authentication and authorization implemented for pipeline access

**Midday (~5 h):**

- Kanban board foundation: property status sort order, property cards in columns
- Kanban column rendering refactored (Record-based cards map)
- Condition due date columns added to properties schema
- Condition due dates displayed in Kanban detail panel Summary tab
- Won/lost status toggle in property detail panel
- Drag-and-drop between Kanban columns implemented

**Evening (~6 h):**

- Buyers pipeline view added to Kanban board
- Deal sub-pipeline with progress stepper in property detail panel

---

### Apr 14 — ~8 h

**Morning (~4 h):**

- Deal pipeline stepper implemented in Summary tab of property detail panel
- Admin navigation and redirect logic updated for properties and pipeline views
- Kanban board: sortable cards with stage management and new card ID functions
- Property management enhancements with buyer pipeline integration and UI polish

**Afternoon/evening (~4 h):**

- Buyers tab sorting and UI updates in property detail
- Property detail notes enhanced: entity name display and sort order
- Buyer pipeline draft seeding and handling improvements in admin interface
- Property entity draft sync and handling enhancements

---

### Apr 15 — ~8 h

**Morning (~4 h):**

- Multi-column sorting for related collections
- File upload handling improvements in property entity files panel
- Sale price and sale date filters added to properties entity
- Property status page simplified with better error handling
- Property entities renamed to property buyers; sorting logic updated

**Afternoon (~4 h):**

- Property status creation with auto-generated sort order
- Kanban and pipeline board scrolling functionality added
- Buyer pipeline stage label updated to "Enquiry"
- Inline date editing for property condition dates
- Buyer filter in notes tab of property detail panel
- Property notes refactored to support property-level notes

---

### Apr 16 — ~8 h

**Morning (~2.5 h):**

- Buyer detail panel: buyer requirements management
- Buyer detail panel: settlement date management
- Entity dialog form enhanced with new field components and buyer statuses panel

**Midday/afternoon (~3.5 h):**

- Agent management integrated into property notes and detail panels
- Dialog title customization for nested entity CRUD operations
- General property search bar with new UI components
- Contact entity fields promoted in property detail responses
- Calendar sync added to buyer detail panel
- Offer conditions management integrated into buyer detail panel

**Evening (~2 h):**

- Contract date field with conditional dialog display
- Automatic suburb sync after property import
- Stage move conditionally sets contract date
- Kanban board enhanced with buyer offers and contract details visibility
- Buyer aging rules implemented in pipeline management
- Hidden filter option added for sidebar panel
- Kanban board buyer offer sorting functionality

---

### Apr 17 — ~9.5 h

**Morning (~4 h):**

- Buyer detail panel and property detail panel restructured with improved tab organization
- Member names added to property detail summary for accepted offers
- Property notes form reorganized; notes section enhanced
- Connection summary filtering fixed (entityId included in API call)
- Property notes enhanced with buyer assignment and entity tracking
- react-big-calendar integrated for scheduling

**Midday/afternoon (~4 h):**

- Buyer offer condition date fields and contract date integration
- Contract conditions: condition notes, settlement days (replacing settlement date), contract date saving
- Offer conditions panel split into contract date and day-count modules
- Contract date E2E tests aligned with seed helpers
- Property Summary tab: accepted offer row removed, buyer overview property card linked to admin edit (opens in new tab)

**Evening (~1.5 h):**

- Zero-day milestones omitted from offer conditions and condition calendar
- Admin property dialog: Add New and Delete buttons hidden in edit mode
- Calendar sync: building & pest event deletion handling improved
- Condition calendar milestone filtering and event style updates
- Buyers representative management: enforce unique representation, clear on reassignment
- Buyer member dialog: buyer's representative checkbox added
- Admin entity routes: improved error handling; buyer member dialog test IDs added

---

### Apr 18 — ~3 h

**Afternoon/evening (~3 h):**

- Property detail panel restructured: Calendar and History tabs removed, Meetings tab added
- Property meetings schema and types added; meetings fetched in property detail queries
- Meeting and Reminder buttons added to property detail panel header
- Property detail Summary tab: buyers list and contact management features integrated
- ContactChip component: Popover replaced with HoverCard for better UX
- Property queries cleaned up: unused entityMembers logic removed
- Meetings tab rendering streamlined; unused AddMeetingDialog removed

---

### Apr 19 — ~2.5 h

**Morning (~2.5 h):**

- Meeting reminders functionality implemented in meeting and reminder dialogs
- Reminder types updated; property detail panel logic improved
- Meeting dialog components reorganized; Google Calendar sync handling enhanced
- Google Calendar events integrated into the condition calendar view
- Condition calendar: event fetching improvements and UI enhancements
- Buyer panel and meeting-related E2E tests updated

---

### Apr 20 — ~7 h

**Session 1 — Buyer offers and map (~3 h):**
- Buyer offers management: isolated client registry, follow-up logic, error handling
- Map component: radius filter, improved responsiveness
- End-to-end tests for buyer offers persistence and map functionality

**Session 2 — Property detail cleanup (~1.5 h):**
- Historical asking price removed from property detail and summary tabs
- Admin edit link added to property detail panel
- Buyer overview tab updated to reflect pricing changes

**Session 3 — Pipeline and Google Contacts (~2.25 h):**
- Buyer offers pipeline: auto-advance logic improved
- Buyer pipeline management streamlined; calendar functionality enhanced
- Google Contacts sync warnings integrated throughout the UI

---

### Apr 21 — ~4.5 h

**Session 1 — Late-night: property connections (~1 h):**
- Property connections: UI improved, error handling added, Playwright regression test added

**Session 2 — Property connections and compact layouts (~2.25 h):**
- Property connections: async search, buyer-context linking, compact layout support
- Buyer entity dialog: simplified layout, improved task tracking
- Quarter-hour time slots added to meeting and reminder dialogs
- Google Contacts: owner-slot integration added to sync

**Session 3 — Properties export (~1 h):**
- XLSX and PDF export added to the properties list toolbar

---

### Apr 22 — ~11 h

**Session 1 — Property files and Google Contacts deep work (~5.75 h):**
- Property entity file management: listing-level files added
- Google Contacts: dialable phone numbers, property list filtering, detailed audit logging, property role management, development-only allowlist for patch-all API

**Session 2 — Lead import and entity creation (~1 h):**
- Lead import toolbar: sync contacts button with error handling
- Entity creation: improved toolbar, relation filter options, submit handling

**Session 3 (incl. carry-over into Apr 23 early morning) — Property connections and buyer management (~4.25 h):**
- Property connections: favorites-only search filter, improved linking and search behavior
- Buyer management: tabbed Members / Requirements / Status panel
- Admin pipeline board: data-testid attributes added

---

### Apr 23 — ~3.25 h

**Session 1 — Buyer management and Google Contacts (~1 h):**
- Buyer management: multi-property support, new tabbed interface, type import consistency
- Google Contacts: buyer representative filtering implemented

**Session 2 — Property connections optimization (~1.25 h):**
- Property-entity connections fetch optimized
- `?fields=address` added to property API; E2E mock helpers extracted
- Task list terminology updated; file-loading logic improved

**Session 3 — Connections UX simplification (~1 h):**
- Property connections UX: all favorites shown in select with linked indicators; separate linking step removed

---

### Apr 24 — ~4 h

**Session 1 — E2E test refresh (~1 h):**
- Stale E2E spec rewritten to use seeded property and correct tab test IDs

**Session 2 — Property contacts and contract conditions (~2.75 h):**
- Property contacts panel: inline CRUD (add, edit, delete)
- Fix: property contacts not displaying in pipeline board panel
- Contract conditions: inline editable panel added to property Sales tab
- Buyers / tenants panels: offer sorting, Open Profile button, spec organization

---

### Apr 25 — ~7 h

**Session 1 — E2E specs and buyers panel (~1.5 h):**
- E2E specs split and expanded; buyers panel add-new form added
- E2E specs for property contacts and tenants add / edit flows

**Session 2 — Offer conditions and contact linking (~1.25 h):**
- Buyer offers panel with E2E specs and registry cleanup
- Offer conditions: subject-to-sale stage added; race-condition fix for field persistence
- Async search combobox to link existing contacts to a property
- Contact dialog: data-testid coverage improved

**Session 3 — Files, forms, and dialog UX (~4.5 h):**
- Property-level files included in the property detail Files tab
- Representatives panel added to the contact dialog
- Property forms tab added with send and upload support
- Property edit dialog now stays open after saving (improved UX)
- Regression E2E spec for contract conditions save persistence

---

### Apr 26 — ~7 h

**Session 1 — Google Contacts sync fixes and calendar events (~2.5 h):**
- Google Contacts synced on property-entity creation
- Google Contacts synced for orphan entities on create
- Large-file upload fixed via Drive resumable upload (resolved 413 errors)
- Add Calendar Event button and dialog added to the condition calendar
- Add Task for Agent button added to the condition calendar

**Session 2 — Pipeline UI enhancements (~1.5 h):**
- Commission dollar amount displayed in the pipeline property panel
- Buyer / Seller role badge shown on pipeline contacts tab
- Phone numbers and all entity members synced to Google Contacts

**Session 3 — Gmail, offer conditions, and contact inbox (~3.25 h):**
- Offer conditions: Sale of Property, Unconditional Contract, Completion Date as structured fields
- Custom conditions (free-entry) added via JSONB field and entry UI
- Settlement field renamed to Completion Date throughout
- Gmail correspondence tracking: per-entity email thread panel and Emails tab
- Property emails tab replaced with unified contact inbox with tooltips
- DELETE handler added to property-entities route (bug fix)

---

### Apr 27 — ~5 h

**Session 1 — Property buyers and columns (~2.25 h):**
- Property buyer creation flow refactored with direct dialog promotion
- Property type dropdown with search functionality and E2E tests
- Offers tab: prevent form auto-closing on button clicks (bug fix)
- Field normalization moved to fix React render warning

**Session 2 — Column modules and status filter (~3 h):**
- Property columns split into domain modules; extra fields added (land size, etc.)
- Property status filter: Select All button and persistent collapse toggle

---

### Apr 28 — ~8 h

**Session 1 — Subject-to-sale and contact enrichment (~2.25 h):**
- Subject-to-sale address field added; buyer property-to-sell tracking implemented
- Add Contact dialog: business name web search with autofill

**Session 2 — Gmail compose feature (~1 h):**
- Gmail compose dialog wired to member and property email fields

**Session 3 — Email compose, offer autofill, and Contacts sync (~4.75 h):**
- Offer conditions: property address auto-filled from property record
- Buyer toolbar: property links kept (bug fix)
- Google Contacts: sync filter added; timing instrumentation added to patch-all
- Quick email compose: full design spec implemented and refined based on feedback

---

### Apr 29 — ~5.5 h

**Session 1 — Quick actions and sellers (~2.5 h):**
- Quick email compose: design refinements based on feedback
- Property list: per-row Add Note and Add Event quick-action buttons
- Sellers admin list with People sidebar section added
- WIP: offer conditions and property-to-sell E2E specs and discoveries

**Session 2 — Buyer details and search (~2.25 h):**
- Buyer details and summary tab: member residence address included
- Email body text: URLs rendered as clickable links
- General property search extended to include owner name and address
- Property Details section: collapsed by default, auto-expands on validation errors

**Session 3 — Sellers filtering (~0.75 h):**
- Seller list: isFavorite filter and DB-level pagination

---

### Apr 30 — ~1.25 h

**Filter panel and Gmail owners (~1.25 h):**
- Collapsible side filter panel added to admin; enabled for panda-realty properties
- Gmail compose and thread panel added to the owners section
