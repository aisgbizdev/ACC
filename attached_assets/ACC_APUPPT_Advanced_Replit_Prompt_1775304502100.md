# ACC – APUPPT Control Center
## Advanced Replit Agent Prompt – Build-Ready Version

You are a senior full-stack product engineer.

Your task is to build a production-style internal web app called **ACC (APUPPT Control Center)** for **Solid Group**.

This app is an internal compliance monitoring dashboard for 5 companies:

- SGB
- RFB
- BPF
- KPF
- EWF

Each company has **1 APUPPT staff**.

The app must be simple, lightweight, clean, professional, and fast to use.

Do **NOT** overbuild the system.

This is **NOT**:
- an AML engine
- a transaction surveillance engine
- a complex case workflow system
- a layered approval system
- a heavy enterprise compliance suite

This **IS**:
- a daily activity monitoring dashboard
- a findings / follow-up tracker
- a traffic-light compliance visibility system
- a simple executive reporting tool

---

## 1. Product Objective

Build a web app where:

### APUPPT Staff can:
- submit 1 daily activity log
- record simple findings / follow-up items
- review their PT’s activity and findings

### DK can:
- see all PTs
- see all findings
- see which PT has updated today
- see which PT is yellow or red

### DU can:
- see compliance summary
- monitor PT condition quickly

### Owner can:
- instantly view group compliance health

---

## 2. Product Philosophy

The app must follow these rules:

1. **One PT = one APUPPT user**
2. **One day = one main activity log per PT**
3. **Input must be fast**
4. **Dashboard must be readable in seconds**
5. **System must feel helpful, not burdensome**
6. **No overengineering**
7. **Mobile friendly**
8. **Professional corporate UI**

Core UX principle:

> Minimal input, maximum visibility.

---

## 3. Required Scope Only

Build ONLY these modules:

1. Authentication
2. Dashboard
3. Daily Activity
4. Findings / Follow Up
5. Reports
6. PT Detail Page

Do not add extra modules unless needed to make the core app function well.

---

## 4. Recommended Tech Stack

Use this stack unless there is a strong reason to simplify:

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query

### Backend
- Node.js
- Express.js
- TypeScript

### Database
- PostgreSQL

### ORM
- Drizzle ORM

### Validation
- Zod

### Auth
- simple email/password auth
- session or JWT auth, whichever is faster and cleaner

---

## 5. Suggested Project Structure

Create a clean monorepo-style or separated structure such as:

```text
root/
  client/
    src/
      components/
      pages/
      layouts/
      lib/
      hooks/
      types/
  server/
    src/
      routes/
      controllers/
      services/
      db/
      middleware/
      utils/
  shared/
    schemas/
    types/
```

If easier, a simpler structure is acceptable, but keep code organized and scalable.

---

## 6. Database Design

Create these tables.

### Table: users
Fields:
- id
- name
- email
- password_hash
- role
- pt_code (nullable for DK/DU/Owner)
- is_active
- created_at
- updated_at

Roles:
- apuppt
- dk
- du
- owner

---

### Table: companies
Fields:
- id
- code
- name
- created_at

Seed with:
- SGB
- RFB
- BPF
- KPF
- EWF

---

### Table: activities
Fields:
- id
- date
- pt_code
- activity_type
- items_reviewed
- has_finding
- finding_summary
- finding_status
- notes
- created_by
- created_at
- updated_at

Rules:
- one main activity record per PT per day
- allow update if same PT/user edits same date entry

---

### Table: findings
Fields:
- id
- date
- pt_code
- finding_text
- status
- notes
- created_by
- created_at
- updated_at
- closed_at (nullable)

Statuses:
- pending
- follow_up
- completed

Finding age should be computed from date to current date unless completed.

---

### Table: reports
Fields:
- id
- report_type
- period_start
- period_end
- generated_data_json
- created_at

Optional: reports can be generated dynamically and stored later only if needed.

---

## 7. Seed Data Requirements

Create default sample data:

### Companies
- SGB
- RFB
- BPF
- KPF
- EWF

### Users
- 5 APUPPT users (one per PT)
- 1 DK user
- 1 DU user
- 1 Owner user

Example:
- apuppt.sgb@acc.local
- apuppt.rfb@acc.local
- apuppt.bpf@acc.local
- apuppt.kpf@acc.local
- apuppt.ewf@acc.local
- dk@acc.local
- du@acc.local
- owner@acc.local

Default passwords can be simple for demo/dev environments.

---

## 8. Routing Structure

Create routes such as:

```text
/login
/dashboard
/activities
/findings
/reports
/pt/:ptCode
```

Use protected routes based on auth.

---

## 9. Role-Based Access Rules

### APUPPT
Can:
- access dashboard
- create/edit their own activity
- view their PT findings
- view their PT reports
- view their PT detail page

Cannot:
- access other PT data
- access full group admin functions

### DK
Can:
- access all PT data
- access all dashboard views
- access all reports

### DU
Can:
- access dashboard
- access reports
- access PT detail pages
- view only, not edit operational data unless you want limited view-only access

### Owner
Can:
- access all high-level views
- view all PT status
- view reports
- view PT detail pages

---

## 10. Dashboard Requirements

Build the dashboard as the primary executive page.

### Top Section – PT Status Cards
Display 5 cards:
- SGB
- RFB
- BPF
- KPF
- EWF

Each card must show:
- PT name
- traffic-light status badge
- updated today: yes/no
- number of findings
- number of pending findings

Clicking a card opens `/pt/:ptCode`.

---

### Middle Section – Summary Metrics
Display 4 summary cards:
- PT updated today
- findings today
- open findings
- completed findings today

---

### Bottom Section – PT Summary Table
Columns:
- PT
- Activity Today
- Findings
- Pending
- Status

Keep it compact and readable.

---

## 11. Traffic Light Logic

Implement simple automatic compliance color status.

### Green
- activity log submitted today
- no finding pending more than 3 days

### Yellow
- activity log submitted today
- has pending or follow-up findings
- but none older than 3 days

### Red
- no activity log submitted today
- OR has finding pending more than 3 days

This logic should be computed dynamically.

---

## 12. Daily Activity Page Requirements

This page is a very simple form.

### Fields
- date
- pt_code
- activity_type
- items_reviewed
- has_finding (boolean)
- finding_summary
- finding_status
- notes

### Activity Types
Provide dropdown:
- transaction_review
- kyc_document_review
- branch_follow_up
- transaction_analysis
- source_of_fund_verification
- report_preparation
- meeting_coordination
- apuppt_socialization

### Finding Status Options
- none
- pending
- follow_up
- completed

### UX Rules
- form should take less than 30 seconds to fill
- use dropdowns
- limit typing
- prefill PT for APUPPT role
- if has_finding = false, hide finding summary and status fields or make them optional

### Additional Logic
If an activity contains a finding and finding summary is filled:
- either create/update a finding record automatically
OR
- allow the activity form to write into findings table in a clean, simple way

Keep implementation simple and maintainable.

---

## 13. Findings Page Requirements

Create a findings table page.

### Columns
- Date
- PT
- Finding
- Status
- Age
- Notes

### Filters
- All
- Pending
- Follow Up
- Completed
- PT filter (optional but useful)

### Actions
- view
- edit
- mark completed

### Logic
- age must be auto-calculated
- completed findings should stop aging
- pending > 3 days contributes to red PT status

Keep this page clean, table-based, and easy to scan.

---

## 14. Reports Page Requirements

Build a simple report page.

### Report Types
- Daily
- Weekly
- Monthly

### Show:
Per PT:
- total activity logs
- total items reviewed
- total findings
- total pending findings
- total completed findings
- average status trend or summary color

Group summary:
- most stable PT
- PT with most findings
- PT with most pending findings
- PT with missed updates

### UI
Allow selecting:
- report type
- date range or relevant period

Show the report on screen first.

Optional:
- print-friendly view
- export PDF later
- export Excel later

Do not over-focus on export in v1.

---

## 15. PT Detail Page Requirements

Create a PT detail page accessible by clicking PT cards.

### Show:
- PT name
- today’s status
- latest activity
- items reviewed today
- active findings
- 7-day status history
- recent activity logs
- recent findings

### 7-Day History
Display compact history:
- date
- green/yellow/red status

A simple horizontal badge history or list is enough.

---

## 16. UI / Design Requirements

The UI must feel like a **clean executive dashboard**.

### Design Style
- corporate
- minimal
- clean
- modern
- no flashy visuals
- no clutter

### Colors
- primary: navy blue
- background: white / light gray
- success: green
- warning: yellow
- danger: red

### Components
Use:
- cards
- badges
- tables
- simple forms
- clear typography

### Avoid
- excessive charts
- complicated nested menus
- dark cluttered layouts
- too many metrics
- visually noisy components

---

## 17. Mobile Responsiveness

The app must be responsive.

### On mobile:
- PT cards stack vertically
- summary cards stack neatly
- tables scroll horizontally
- forms remain easy to use
- navigation remains simple

This app should be usable from phone for executive quick checks.

---

## 18. API Endpoints Suggestion

Create REST endpoints like:

### Auth
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/me`

### Dashboard
- GET `/api/dashboard/summary`
- GET `/api/dashboard/pt-status`

### Activities
- GET `/api/activities`
- POST `/api/activities`
- PUT `/api/activities/:id`

### Findings
- GET `/api/findings`
- POST `/api/findings`
- PUT `/api/findings/:id`
- PATCH `/api/findings/:id/complete`

### Reports
- GET `/api/reports`
- GET `/api/reports/summary`
- POST `/api/reports/generate`

### PT Detail
- GET `/api/pt/:ptCode`

Keep endpoints simple.

---

## 19. Validation Rules

Use Zod or equivalent for validation.

Examples:
- date is required
- pt_code is required
- items_reviewed must be a non-negative number
- finding_summary required only if has_finding = true
- finding_status required only if has_finding = true

Prevent duplicate daily activities for the same PT and same date unless updating existing entry.

---

## 20. Business Rules

Implement these business rules:

1. One APUPPT user is linked to one PT
2. APUPPT users can only write and view their PT data
3. DK/DU/Owner can view broader group data according to role
4. One PT should ideally have one daily activity log per date
5. Findings can remain open until completed
6. PT color is determined by update + finding age status
7. System should prioritize clarity over complexity

---

## 21. Build Order (Important)

Build the app in this exact order:

### Phase 1
- project setup
- database schema
- seed data
- authentication
- protected routes

### Phase 2
- dashboard
- PT status cards
- traffic light logic
- summary metrics

### Phase 3
- daily activity form
- activity listing if needed

### Phase 4
- findings page
- finding status logic
- finding age calculation

### Phase 5
- reports page
- PT detail page

### Phase 6
- UI refinement
- mobile responsiveness
- final cleanup

Do not jump ahead into unnecessary features.

---

## 22. Deliverable Expectation

The finished app must already include:

- working login
- role-based access
- seeded sample data
- dashboard with traffic-light status
- working daily activity input
- findings tracking
- PT detail page
- report page
- clean responsive UI

The app should be demo-ready.

---

## 23. What To Avoid

Do NOT add:
- AI detection
- smart compliance scoring engines
- complex KPI engines
- multilevel approvals
- notifications center
- chat modules
- transaction integrations
- enterprise workflow builders

This is intentionally a focused MVP.

---

## 24. Output Coding Style

Please write:
- clean TypeScript
- reusable components
- readable folder structure
- clear API handlers
- simple state management
- maintainable code

Prefer clarity over cleverness.

Add brief comments only where helpful.

---

## 25. Final Product Standard

The final product must feel like this:

- APUPPT logs work in seconds
- DK sees which PT is okay or risky
- DU gets a fast summary
- Owner understands group compliance health at a glance

This app should feel like:

**a lightweight executive compliance control panel**

not:

**a heavy bureaucratic enterprise tool**

---

## 26. Nice-to-Have Only If Easy

Only if fast and easy, you may also add:
- print-friendly reports
- simple search on findings
- date filters
- logout button in header
- seed/demo login helper on dev environment

But do not let these delay the core build.

---

## 27. Final Instruction

Start building now.

Use the exact scope above.

Keep the product:
- simple
- elegant
- operational
- fast
- mobile friendly
- easy to demo
